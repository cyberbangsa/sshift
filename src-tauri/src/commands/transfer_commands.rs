use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferStatus {
    pub id: String,
    pub session_id: String,
    pub source_path: String,
    pub destination_path: String,
    pub direction: String,
    pub status: String,
    pub progress: f64,
    pub bytes_per_second: f64,
}

#[tauri::command]
pub async fn get_transfer_status(transfer_id: String) -> Result<TransferStatus, String> {
    Err(format!(
        "Transfer status not yet implemented for: {}",
        transfer_id
    ))
}

#[tauri::command]
pub async fn cancel_transfer(transfer_id: String) -> Result<(), String> {
    Err(format!(
        "Cancel transfer not yet implemented for: {}",
        transfer_id
    ))
}
