pub mod commands;
pub mod domain;
pub mod infrastructure;

use commands::{
    file_commands::*,
    host_commands::*,
    session_commands::*,
    settings_commands::*,
    transfer_commands::*,
};
use infrastructure::ssh::SshManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(SshManager::new())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_all_hosts,
            get_host_by_id,
            save_host,
            delete_host,
            connect_session,
            disconnect_session,
            write_to_pty,
            resize_pty,
            execute_command,
            list_directory,
            list_local_directory,
            list_remote_directory,
            get_home_directory,
            upload_file,
            download_file,
            delete_remote_file,
            rename_remote_file,
            get_transfer_status,
            cancel_transfer,
            get_api_key,
            set_api_key,
            delete_api_key,
            read_remote_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests;
