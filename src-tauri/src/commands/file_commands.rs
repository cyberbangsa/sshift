use crate::domain::entities::FileEntry;

#[tauri::command]
pub async fn list_directory(
    session_id: String,
    path: String,
) -> Result<Vec<FileEntry>, String> {
    // In production, this would use a shared SFTP client instance
    // For now, returns an error since SFTP requires an active SSH session
    Err(format!(
        "SFTP not yet connected for session {}. Path: {}",
        session_id, path
    ))
}

#[tauri::command]
pub async fn upload_file(
    session_id: String,
    local_path: String,
    remote_path: String,
) -> Result<String, String> {
    Err(format!(
        "Upload not yet implemented. Session: {}, {} -> {}",
        session_id, local_path, remote_path
    ))
}

#[tauri::command]
pub async fn download_file(
    session_id: String,
    remote_path: String,
    local_path: String,
) -> Result<String, String> {
    Err(format!(
        "Download not yet implemented. Session: {}, {} -> {}",
        session_id, remote_path, local_path
    ))
}

#[tauri::command]
pub async fn delete_remote_file(session_id: String, path: String) -> Result<(), String> {
    Err(format!(
        "Delete not yet implemented. Session: {}, Path: {}",
        session_id, path
    ))
}

#[tauri::command]
pub async fn rename_remote_file(
    session_id: String,
    old_path: String,
    new_path: String,
) -> Result<(), String> {
    Err(format!(
        "Rename not yet implemented. Session: {}, {} -> {}",
        session_id, old_path, new_path
    ))
}
