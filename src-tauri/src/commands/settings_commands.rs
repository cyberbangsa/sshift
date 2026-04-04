use keyring::Entry;

const KEYRING_SERVICE: &str = "sshift";

/// Retrieve a stored API key for the given provider from the OS keychain.
/// Returns `None` if no key has been stored yet.
#[tauri::command]
pub fn get_api_key(provider: String) -> Result<Option<String>, String> {
    let entry = Entry::new(KEYRING_SERVICE, &provider)
        .map_err(|e| format!("Keychain error: {e}"))?;

    match entry.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Failed to read keychain: {e}")),
    }
}

/// Store an API key for the given provider in the OS keychain.
#[tauri::command]
pub fn set_api_key(provider: String, key: String) -> Result<(), String> {
    let entry = Entry::new(KEYRING_SERVICE, &provider)
        .map_err(|e| format!("Keychain error: {e}"))?;

    entry
        .set_password(&key)
        .map_err(|e| format!("Failed to store key: {e}"))
}

/// Remove the stored API key for the given provider from the OS keychain.
#[tauri::command]
pub fn delete_api_key(provider: String) -> Result<(), String> {
    let entry = Entry::new(KEYRING_SERVICE, &provider)
        .map_err(|e| format!("Keychain error: {e}"))?;

    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // already gone — not an error
        Err(e) => Err(format!("Failed to delete key: {e}")),
    }
}
