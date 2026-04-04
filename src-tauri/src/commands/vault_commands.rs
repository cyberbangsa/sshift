use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

// ── Types ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultEntry {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub entry_type: VaultEntryType,
    pub created_at: chrono::DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum VaultEntryType {
    PrivateKey,
    PublicKey,
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/// Returns (and creates) the vault directory inside the app data dir.
pub fn vault_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let dir = app_dir.join("vault");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn index_path(vault: &PathBuf) -> PathBuf {
    vault.join("index.json")
}

fn read_index(vault: &PathBuf) -> Result<Vec<VaultEntry>, String> {
    let p = index_path(vault);
    if !p.exists() {
        return Ok(Vec::new());
    }
    let raw = fs::read_to_string(&p).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

fn write_index(vault: &PathBuf, entries: &[VaultEntry]) -> Result<(), String> {
    let raw = serde_json::to_string_pretty(entries).map_err(|e| e.to_string())?;
    fs::write(index_path(vault), raw).map_err(|e| e.to_string())
}

/// Returns the absolute path of the key file for a vault entry.
/// Used by `session_commands` to pass the resolved path to the SSH manager.
pub fn key_file_path(vault: &PathBuf, id: &str) -> PathBuf {
    vault.join(id)
}

// ── Tauri commands ────────────────────────────────────────────────────────────

/// List all vault entries (metadata only — content is never returned).
#[tauri::command]
pub async fn get_all_vault_entries(
    app_handle: tauri::AppHandle,
) -> Result<Vec<VaultEntry>, String> {
    let dir = vault_dir(&app_handle)?;
    read_index(&dir)
}

/// Store a new private/public key in the vault.
/// `content` is the raw PEM/OpenSSH key text.
/// Returns the created metadata entry.
#[tauri::command]
pub async fn add_vault_entry(
    app_handle: tauri::AppHandle,
    name: String,
    entry_type: VaultEntryType,
    content: String,
) -> Result<VaultEntry, String> {
    let dir = vault_dir(&app_handle)?;
    let id = uuid::Uuid::new_v4().to_string();

    // Write key content to a file named by its UUID.
    let key_file = key_file_path(&dir, &id);
    fs::write(&key_file, &content).map_err(|e| e.to_string())?;

    // Restrict file permissions to owner-read-only (Unix / macOS).
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&key_file, fs::Permissions::from_mode(0o600))
            .map_err(|e| e.to_string())?;
    }

    let entry = VaultEntry {
        id,
        name,
        entry_type,
        created_at: Utc::now(),
    };

    let mut entries = read_index(&dir)?;
    entries.push(entry.clone());
    write_index(&dir, &entries)?;

    Ok(entry)
}

/// Rename an existing vault entry.
#[tauri::command]
pub async fn rename_vault_entry(
    app_handle: tauri::AppHandle,
    id: String,
    name: String,
) -> Result<(), String> {
    let dir = vault_dir(&app_handle)?;
    let mut entries = read_index(&dir)?;
    let entry = entries
        .iter_mut()
        .find(|e| e.id == id)
        .ok_or_else(|| format!("Vault entry not found: {id}"))?;
    entry.name = name;
    write_index(&dir, &entries)
}

/// Permanently delete a vault entry and its key file.
#[tauri::command]
pub async fn delete_vault_entry(
    app_handle: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    let dir = vault_dir(&app_handle)?;

    let key_file = key_file_path(&dir, &id);
    if key_file.exists() {
        fs::remove_file(&key_file).map_err(|e| e.to_string())?;
    }

    let mut entries = read_index(&dir)?;
    entries.retain(|e| e.id != id);
    write_index(&dir, &entries)
}
