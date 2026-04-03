use crate::domain::entities::Host;
use serde_json;
use std::fs;
use std::path::PathBuf;

fn hosts_file_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    Ok(app_dir.join("hosts.json"))
}

use tauri::Manager;

#[tauri::command]
pub async fn get_all_hosts(app_handle: tauri::AppHandle) -> Result<Vec<Host>, String> {
    let path = hosts_file_path(&app_handle)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let hosts: Vec<Host> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(hosts)
}

#[tauri::command]
pub async fn get_host_by_id(
    app_handle: tauri::AppHandle,
    id: String,
) -> Result<Option<Host>, String> {
    let hosts = get_all_hosts(app_handle).await?;
    Ok(hosts.into_iter().find(|h| h.id == id))
}

#[tauri::command]
pub async fn save_host(app_handle: tauri::AppHandle, host: Host) -> Result<(), String> {
    let path = hosts_file_path(&app_handle)?;
    let mut hosts = if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str::<Vec<Host>>(&content).unwrap_or_default()
    } else {
        Vec::new()
    };

    if let Some(index) = hosts.iter().position(|h| h.id == host.id) {
        hosts[index] = host;
    } else {
        hosts.push(host);
    }

    let content = serde_json::to_string_pretty(&hosts).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_host(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    let path = hosts_file_path(&app_handle)?;
    if !path.exists() {
        return Ok(());
    }

    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut hosts: Vec<Host> = serde_json::from_str(&content).unwrap_or_default();
    hosts.retain(|h| h.id != id);

    let content = serde_json::to_string_pretty(&hosts).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}
