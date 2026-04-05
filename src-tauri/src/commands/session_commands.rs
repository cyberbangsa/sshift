use crate::domain::entities::{AuthMethod, Host, Session};
use crate::infrastructure::ssh::SshManager;

/// Connect to a host and open an interactive PTY shell.
/// Output is streamed via Tauri events: `terminal-output:{sessionId}` and `terminal-closed:{sessionId}`.
#[tauri::command]
pub async fn connect_session(
    state: tauri::State<'_, SshManager>,
    app: tauri::AppHandle,
    host_id: String,
    hostname: String,
    port: u16,
    username: String,
    auth_method: AuthMethod,
    private_key_path: Option<String>,
    password: Option<String>,
) -> Result<Session, String> {
    let host = Host {
        id: host_id,
        label: String::new(),
        hostname,
        port,
        username,
        auth_method,
        private_key_path,
        tags: Vec::new(),
        created_at: chrono::Utc::now(),
    };
    state.connect(host, password, app).await.map_err(|e| e.to_string())
}

/// Send raw keyboard bytes to the PTY stdin.
#[tauri::command]
pub fn write_to_pty(
    state: tauri::State<'_, SshManager>,
    session_id: String,
    data: Vec<u8>,
) -> Result<(), String> {
    state.write_to_pty(&session_id, data).map_err(|e| e.to_string())
}

/// Notify the PTY of a terminal resize.
#[tauri::command]
pub fn resize_pty(
    state: tauri::State<'_, SshManager>,
    session_id: String,
    cols: u32,
    rows: u32,
) -> Result<(), String> {
    state.resize_pty(&session_id, cols, rows).map_err(|e| e.to_string())
}

/// Disconnect a session and tear down the PTY channel.
#[tauri::command]
pub fn disconnect_session(
    state: tauri::State<'_, SshManager>,
    session_id: String,
) -> Result<(), String> {
    state.disconnect(&session_id).map_err(|e| e.to_string())
}

/// Send a command line to the PTY (the output arrives as events, not as a return value).
#[tauri::command]
pub fn execute_command(
    state: tauri::State<'_, SshManager>,
    session_id: String,
    command: String,
) -> Result<(), String> {
    let line = format!("{command}\n");
    state.write_to_pty(&session_id, line.into_bytes()).map_err(|e| e.to_string())
}
