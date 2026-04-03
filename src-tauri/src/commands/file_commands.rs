use std::fs;
use std::sync::mpsc::sync_channel;
use tauri::{AppHandle, State};

use crate::domain::entities::{FileEntry, FileEntryType};
use crate::infrastructure::ssh::{SftpCommand, SshManager};
use crate::infrastructure::ssh::sftp_worker::format_permissions;

// ── Local helpers ─────────────────────────────────────────────────────────────

fn read_local_dir(path: &str) -> Result<Vec<FileEntry>, String> {
    let dir_entries =
        fs::read_dir(path).map_err(|e| format!("Cannot read '{}': {}", path, e))?;

    let mut entries: Vec<FileEntry> = dir_entries
        .filter_map(|e| e.ok())
        .filter_map(|entry| {
            let name = entry.file_name().to_string_lossy().to_string();
            let meta = entry.metadata().ok()?;
            let full_path = entry.path().to_string_lossy().to_string();
            let is_dir = meta.is_dir();
            let size = if meta.is_file() { meta.len() } else { 0 };

            let modified_at = meta
                .modified()
                .ok()
                .map(|t| chrono::DateTime::from(t))
                .unwrap_or_else(chrono::Utc::now);

            #[cfg(unix)]
            let permissions = {
                use std::os::unix::fs::PermissionsExt;
                format_permissions(meta.permissions().mode())
            };
            #[cfg(not(unix))]
            let permissions = if meta.permissions().readonly() {
                "r--r--r--".to_string()
            } else {
                "rw-rw-rw-".to_string()
            };

            Some(FileEntry {
                name,
                path: full_path,
                entry_type: if is_dir {
                    FileEntryType::Directory
                } else {
                    FileEntryType::File
                },
                size,
                permissions,
                modified_at,
            })
        })
        .collect();

    entries.sort_by(|a, b| match (&a.entry_type, &b.entry_type) {
        (FileEntryType::Directory, FileEntryType::File) => std::cmp::Ordering::Less,
        (FileEntryType::File, FileEntryType::Directory) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

// ── Local commands ────────────────────────────────────────────────────────────

/// Returns the user's home directory path.
#[tauri::command]
pub async fn get_home_directory() -> Result<String, String> {
    std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| "Cannot determine home directory".to_string())
}

/// Lists entries in a local directory.  Expands "~" to the home directory.
#[tauri::command]
pub async fn list_local_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let expanded = if path == "~" || path.is_empty() {
        std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| "/".to_string())
    } else if let Some(rest) = path.strip_prefix("~/") {
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_default();
        format!("{}/{}", home, rest)
    } else {
        path.clone()
    };

    tokio::task::spawn_blocking(move || read_local_dir(&expanded))
        .await
        .map_err(|e| e.to_string())?
}

// ── Remote (SFTP) commands ────────────────────────────────────────────────────

/// Lists entries in a remote directory over SFTP.
/// Lazily opens an SFTP connection on the first call for each session.
#[tauri::command]
pub async fn list_remote_directory(
    session_id: String,
    path: String,
    state: State<'_, SshManager>,
    app: AppHandle,
) -> Result<Vec<FileEntry>, String> {
    let sftp_tx = state
        .sftp_tx(&session_id, &app)
        .map_err(|e| e.to_string())?;

    let (reply_tx, reply_rx) = sync_channel::<Result<Vec<FileEntry>, String>>(1);
    sftp_tx
        .send(SftpCommand::ListDir {
            path,
            reply: reply_tx,
        })
        .map_err(|_| "SFTP worker disconnected".to_string())?;

    tokio::task::spawn_blocking(move || {
        reply_rx
            .recv_timeout(std::time::Duration::from_secs(30))
            .map_err(|_| "SFTP list_dir timed out".to_string())
            .and_then(|r| r)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Uploads a local file to the remote host.
/// Progress is streamed via `transfer-progress:{transfer_id}` Tauri events.
#[tauri::command]
pub async fn upload_file(
    session_id: String,
    local_path: String,
    remote_path: String,
    transfer_id: String,
    state: State<'_, SshManager>,
    app: AppHandle,
) -> Result<(), String> {
    let sftp_tx = state
        .sftp_tx(&session_id, &app)
        .map_err(|e| e.to_string())?;

    sftp_tx
        .send(SftpCommand::Upload {
            local_path,
            remote_path,
            transfer_id,
        })
        .map_err(|_| "SFTP worker disconnected".to_string())
}

/// Downloads a remote file to a local path.
/// Progress is streamed via `transfer-progress:{transfer_id}` Tauri events.
#[tauri::command]
pub async fn download_file(
    session_id: String,
    remote_path: String,
    local_path: String,
    transfer_id: String,
    state: State<'_, SshManager>,
    app: AppHandle,
) -> Result<(), String> {
    let sftp_tx = state
        .sftp_tx(&session_id, &app)
        .map_err(|e| e.to_string())?;

    sftp_tx
        .send(SftpCommand::Download {
            remote_path,
            local_path,
            transfer_id,
        })
        .map_err(|_| "SFTP worker disconnected".to_string())
}

/// Deletes a remote file or empty directory.
#[tauri::command]
pub async fn delete_remote_file(
    session_id: String,
    path: String,
    state: State<'_, SshManager>,
    app: AppHandle,
) -> Result<(), String> {
    let sftp_tx = state
        .sftp_tx(&session_id, &app)
        .map_err(|e| e.to_string())?;

    let (reply_tx, reply_rx) = sync_channel::<Result<(), String>>(1);
    sftp_tx
        .send(SftpCommand::Delete {
            path,
            reply: reply_tx,
        })
        .map_err(|_| "SFTP worker disconnected".to_string())?;

    tokio::task::spawn_blocking(move || {
        reply_rx
            .recv_timeout(std::time::Duration::from_secs(15))
            .map_err(|_| "delete timed out".to_string())
            .and_then(|r| r)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Renames / moves a remote path.
#[tauri::command]
pub async fn rename_remote_file(
    session_id: String,
    old_path: String,
    new_path: String,
    state: State<'_, SshManager>,
    app: AppHandle,
) -> Result<(), String> {
    let sftp_tx = state
        .sftp_tx(&session_id, &app)
        .map_err(|e| e.to_string())?;

    let (reply_tx, reply_rx) = sync_channel::<Result<(), String>>(1);
    sftp_tx
        .send(SftpCommand::Rename {
            old_path,
            new_path,
            reply: reply_tx,
        })
        .map_err(|_| "SFTP worker disconnected".to_string())?;

    tokio::task::spawn_blocking(move || {
        reply_rx
            .recv_timeout(std::time::Duration::from_secs(15))
            .map_err(|_| "rename timed out".to_string())
            .and_then(|r| r)
    })
    .await
    .map_err(|e| e.to_string())?
}

// Keep old stub alias for backward compatibility.
#[tauri::command]
pub async fn list_directory(session_id: String, path: String) -> Result<Vec<FileEntry>, String> {
    Err(format!(
        "Use list_remote_directory. (session={session_id}, path={path})"
    ))
}
