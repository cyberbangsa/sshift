/// SftpWorker — a dedicated thread per SSH session that owns the ssh2 SFTP
/// subsystem and processes file-operation commands sent through a channel.
/// Using a dedicated thread avoids the `!Send` constraint of ssh2::Session.
use ssh2::Session as Ssh2Session;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::Path;
use std::sync::mpsc::{sync_channel, SyncSender};
use tauri::{AppHandle, Emitter};

use crate::domain::entities::{AuthMethod, FileEntry, FileEntryType, Host};
use chrono::DateTime;

const CHUNK: usize = 128 * 1024; // 128 KB read/write buffer

// ── Public transfer progress payload ─────────────────────────────────────────

#[derive(Debug, serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TransferProgress {
    pub transfer_id: String,
    pub bytes_transferred: u64,
    pub total_bytes: u64,
    pub percent: f64,
    /// "active" | "complete" | "failed"
    pub status: String,
}

// ── Commands ──────────────────────────────────────────────────────────────────

pub enum SftpCommand {
    ListDir {
        path: String,
        reply: SyncSender<Result<Vec<FileEntry>, String>>,
    },
    StatFile {
        path: String,
        reply: SyncSender<Result<FileEntry, String>>,
    },
    Upload {
        local_path: String,
        remote_path: String,
        transfer_id: String,
    },
    Download {
        remote_path: String,
        local_path: String,
        transfer_id: String,
    },
    Delete {
        path: String,
        reply: SyncSender<Result<(), String>>,
    },
    Rename {
        old_path: String,
        new_path: String,
        reply: SyncSender<Result<(), String>>,
    },
    Mkdir {
        path: String,
        reply: SyncSender<Result<(), String>>,
    },
    Disconnect,
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Spawns the SFTP worker thread and returns a sender to issue commands.
/// The SFTP connection is established inside the thread so we don't block the
/// async tokio executor.
pub fn start_sftp_worker(
    host: Host,
    password: Option<String>,
    app: AppHandle,
    result_tx: SyncSender<Result<SyncSender<SftpCommand>, String>>,
) {
    std::thread::spawn(move || {
        sftp_thread(host, password, app, result_tx);
    });
}

// ── Thread body ───────────────────────────────────────────────────────────────

fn sftp_thread(
    host: Host,
    password: Option<String>,
    app: AppHandle,
    result_tx: SyncSender<Result<SyncSender<SftpCommand>, String>>,
) {
    // ── TCP + SSH handshake ───────────────────────────────────────────────────
    let addr = format!("{}:{}", host.hostname, host.port);
    let tcp = match TcpStream::connect(&addr) {
        Ok(t) => t,
        Err(e) => {
            let _ = result_tx.send(Err(format!("SFTP TCP connect to {addr}: {e}")));
            return;
        }
    };
    let mut ssh = match Ssh2Session::new() {
        Ok(s) => s,
        Err(e) => {
            let _ = result_tx.send(Err(e.to_string()));
            return;
        }
    };
    ssh.set_tcp_stream(tcp);
    if let Err(e) = ssh.handshake() {
        let _ = result_tx.send(Err(format!("SFTP handshake: {e}")));
        return;
    }

    // ── Auth ──────────────────────────────────────────────────────────────────
    let auth_result = match &host.auth_method {
        AuthMethod::Password => {
            let pw = password.as_deref().unwrap_or("");
            ssh.userauth_password(&host.username, pw)
        }
        AuthMethod::PrivateKey => match host.private_key_path.as_deref() {
            None => {
                let _ = result_tx.send(Err("Private key path required for SFTP".to_string()));
                return;
            }
            Some(path) => {
                ssh.userauth_pubkey_file(&host.username, None, Path::new(path), None)
            }
        },
    };
    if let Err(e) = auth_result {
        let _ = result_tx.send(Err(format!("SFTP auth: {e}")));
        return;
    }

    // ── Open SFTP subsystem ───────────────────────────────────────────────────
    let sftp = match ssh.sftp() {
        Ok(s) => s,
        Err(e) => {
            let _ = result_tx.send(Err(format!("SFTP subsystem: {e}")));
            return;
        }
    };

    // ── Create command channel and signal success ─────────────────────────────
    let (cmd_tx, cmd_rx) = sync_channel::<SftpCommand>(128);
    let _ = result_tx.send(Ok(cmd_tx));
    // result_tx is dropped — don't touch it after this point

    // ── Event loop ────────────────────────────────────────────────────────────
    loop {
        match cmd_rx.recv() {
            Ok(SftpCommand::Disconnect) | Err(_) => return,

            Ok(SftpCommand::ListDir { path, reply }) => {
                let _ = reply.send(sftp_list_dir(&sftp, &path));
            }

            Ok(SftpCommand::StatFile { path, reply }) => {
                let _ = reply.send(sftp_stat(&sftp, &path));
            }

            Ok(SftpCommand::Upload { local_path, remote_path, transfer_id }) => {
                sftp_upload(&sftp, &local_path, &remote_path, &transfer_id, &app);
            }

            Ok(SftpCommand::Download { remote_path, local_path, transfer_id }) => {
                sftp_download(&sftp, &remote_path, &local_path, &transfer_id, &app);
            }

            Ok(SftpCommand::Delete { path, reply }) => {
                // Try unlink first; fall back to rmdir for empty directories
                let r = sftp.unlink(Path::new(&path))
                    .or_else(|_| sftp.rmdir(Path::new(&path)))
                    .map_err(|e| e.to_string());
                let _ = reply.send(r);
            }

            Ok(SftpCommand::Rename { old_path, new_path, reply }) => {
                let r = sftp
                    .rename(Path::new(&old_path), Path::new(&new_path), None)
                    .map_err(|e| e.to_string());
                let _ = reply.send(r);
            }

            Ok(SftpCommand::Mkdir { path, reply }) => {
                let r = sftp
                    .mkdir(Path::new(&path), 0o755)
                    .map_err(|e| e.to_string());
                let _ = reply.send(r);
            }
        }
    }
}

// ── SFTP helpers ──────────────────────────────────────────────────────────────

fn sftp_list_dir(sftp: &ssh2::Sftp, path: &str) -> Result<Vec<FileEntry>, String> {
    let raw = sftp.readdir(Path::new(path)).map_err(|e| e.to_string())?;

    let mut entries: Vec<FileEntry> = raw
        .into_iter()
        .map(|(pb, stat)| {
            let name = pb.file_name().unwrap_or_default().to_string_lossy().to_string();
            let full_path = pb.to_string_lossy().to_string();
            let entry_type = if stat.is_dir() {
                FileEntryType::Directory
            } else if stat.file_type().is_symlink() {
                FileEntryType::Symlink
            } else {
                FileEntryType::File
            };
            FileEntry {
                name,
                path: full_path,
                entry_type,
                size: stat.size.unwrap_or(0),
                permissions: format_permissions(stat.perm.unwrap_or(0)),
                modified_at: DateTime::from_timestamp(stat.mtime.unwrap_or(0) as i64, 0)
                    .unwrap_or_default(),
            }
        })
        .collect();

    entries.sort_by(|a, b| match (&a.entry_type, &b.entry_type) {
        (FileEntryType::Directory, FileEntryType::File) => std::cmp::Ordering::Less,
        (FileEntryType::File, FileEntryType::Directory) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

fn sftp_stat(sftp: &ssh2::Sftp, path: &str) -> Result<FileEntry, String> {
    let stat = sftp.stat(Path::new(path)).map_err(|e| e.to_string())?;
    let pb = Path::new(path);
    let name = pb.file_name().unwrap_or_default().to_string_lossy().to_string();
    let entry_type = if stat.is_dir() {
        FileEntryType::Directory
    } else {
        FileEntryType::File
    };
    Ok(FileEntry {
        name,
        path: path.to_string(),
        entry_type,
        size: stat.size.unwrap_or(0),
        permissions: format_permissions(stat.perm.unwrap_or(0)),
        modified_at: DateTime::from_timestamp(stat.mtime.unwrap_or(0) as i64, 0)
            .unwrap_or_default(),
    })
}

fn sftp_upload(
    sftp: &ssh2::Sftp,
    local_path: &str,
    remote_path: &str,
    transfer_id: &str,
    app: &AppHandle,
) {
    let ev = format!("transfer-progress:{transfer_id}");

    let local_file = match std::fs::File::open(local_path) {
        Ok(f) => f,
        Err(e) => {
            emit_progress(app, &ev, transfer_id, 0, 0, "failed");
            log::error!("upload open local {local_path}: {e}");
            return;
        }
    };
    let total_bytes = local_file.metadata().map(|m| m.len()).unwrap_or(0);

    let mut remote_file = match sftp.create(Path::new(remote_path)) {
        Ok(f) => f,
        Err(e) => {
            emit_progress(app, &ev, transfer_id, 0, total_bytes, "failed");
            log::error!("upload create remote {remote_path}: {e}");
            return;
        }
    };

    let mut reader = std::io::BufReader::with_capacity(CHUNK, local_file);
    let mut buf = vec![0u8; CHUNK];
    let mut transferred: u64 = 0;

    loop {
        let n = match reader.read(&mut buf) {
            Ok(0) => break,
            Ok(n) => n,
            Err(e) => {
                emit_progress(app, &ev, transfer_id, transferred, total_bytes, "failed");
                log::error!("upload read: {e}");
                return;
            }
        };
        if remote_file.write_all(&buf[..n]).is_err() {
            emit_progress(app, &ev, transfer_id, transferred, total_bytes, "failed");
            return;
        }
        transferred += n as u64;
        emit_progress(app, &ev, transfer_id, transferred, total_bytes, "active");
    }

    emit_progress(app, &ev, transfer_id, transferred, total_bytes, "complete");
}

fn sftp_download(
    sftp: &ssh2::Sftp,
    remote_path: &str,
    local_path: &str,
    transfer_id: &str,
    app: &AppHandle,
) {
    let ev = format!("transfer-progress:{transfer_id}");

    let stat = match sftp.stat(Path::new(remote_path)) {
        Ok(s) => s,
        Err(e) => {
            emit_progress(app, &ev, transfer_id, 0, 0, "failed");
            log::error!("download stat {remote_path}: {e}");
            return;
        }
    };
    let total_bytes = stat.size.unwrap_or(0);

    let mut remote_file = match sftp.open(Path::new(remote_path)) {
        Ok(f) => f,
        Err(e) => {
            emit_progress(app, &ev, transfer_id, 0, total_bytes, "failed");
            log::error!("download open remote {remote_path}: {e}");
            return;
        }
    };

    let mut local_file = match std::fs::File::create(local_path) {
        Ok(f) => f,
        Err(e) => {
            emit_progress(app, &ev, transfer_id, 0, total_bytes, "failed");
            log::error!("download create local {local_path}: {e}");
            return;
        }
    };

    let mut buf = vec![0u8; CHUNK];
    let mut transferred: u64 = 0;

    loop {
        let n = match remote_file.read(&mut buf) {
            Ok(0) => break,
            Ok(n) => n,
            Err(e) => {
                emit_progress(app, &ev, transfer_id, transferred, total_bytes, "failed");
                log::error!("download read: {e}");
                return;
            }
        };
        if local_file.write_all(&buf[..n]).is_err() {
            emit_progress(app, &ev, transfer_id, transferred, total_bytes, "failed");
            return;
        }
        transferred += n as u64;
        emit_progress(app, &ev, transfer_id, transferred, total_bytes, "active");
    }

    emit_progress(app, &ev, transfer_id, transferred, total_bytes, "complete");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn emit_progress(
    app: &AppHandle,
    event: &str,
    transfer_id: &str,
    bytes_transferred: u64,
    total_bytes: u64,
    status: &str,
) {
    let percent = if total_bytes > 0 {
        bytes_transferred as f64 / total_bytes as f64 * 100.0
    } else if status == "complete" {
        100.0
    } else {
        0.0
    };
    let _ = app.emit(
        event,
        TransferProgress {
            transfer_id: transfer_id.to_string(),
            bytes_transferred,
            total_bytes,
            percent,
            status: status.to_string(),
        },
    );
}

pub fn format_permissions(mode: u32) -> String {
    let chars = [
        if mode & 0o400 != 0 { 'r' } else { '-' },
        if mode & 0o200 != 0 { 'w' } else { '-' },
        if mode & 0o100 != 0 { 'x' } else { '-' },
        if mode & 0o040 != 0 { 'r' } else { '-' },
        if mode & 0o020 != 0 { 'w' } else { '-' },
        if mode & 0o010 != 0 { 'x' } else { '-' },
        if mode & 0o004 != 0 { 'r' } else { '-' },
        if mode & 0o002 != 0 { 'w' } else { '-' },
        if mode & 0o001 != 0 { 'x' } else { '-' },
    ];
    chars.iter().collect()
}
