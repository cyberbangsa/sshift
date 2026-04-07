use keyring::Entry;

use crate::domain::entities::Credential;

const SERVICE_NAME: &str = "sshift";

pub struct CredentialStore;

impl Default for CredentialStore {
    fn default() -> Self {
        Self::new()
    }
}

impl CredentialStore {
    pub fn new() -> Self {
        Self
    }

    /// Stores a credential securely using the OS keychain.
    pub fn store(&self, credential: &Credential) -> Result<(), CredentialStoreError> {
        let entry = Entry::new(SERVICE_NAME, &credential.host_id)
            .map_err(|e| CredentialStoreError::KeyringError(e.to_string()))?;

        entry
            .set_password(&credential.secret)
            .map_err(|e| CredentialStoreError::KeyringError(e.to_string()))?;

        Ok(())
    }

    /// Retrieves a credential from the OS keychain.
    pub fn retrieve(&self, host_id: &str) -> Result<Option<Credential>, CredentialStoreError> {
        let entry = Entry::new(SERVICE_NAME, host_id)
            .map_err(|e| CredentialStoreError::KeyringError(e.to_string()))?;

        match entry.get_password() {
            Ok(secret) => Ok(Some(Credential {
                host_id: host_id.to_string(),
                secret,
            })),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(CredentialStoreError::KeyringError(e.to_string())),
        }
    }

    /// Deletes a credential from the OS keychain.
    pub fn delete(&self, host_id: &str) -> Result<(), CredentialStoreError> {
        let entry = Entry::new(SERVICE_NAME, host_id)
            .map_err(|e| CredentialStoreError::KeyringError(e.to_string()))?;

        match entry.delete_credential() {
            Ok(()) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(CredentialStoreError::KeyringError(e.to_string())),
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum CredentialStoreError {
    #[error("Keyring error: {0}")]
    KeyringError(String),
}
