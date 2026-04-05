use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Host {
    pub id: String,
    pub label: String,
    pub hostname: String,
    pub port: u16,
    pub username: String,
    pub auth_method: AuthMethod,
    /// Resolved file-system path used directly by the SSH layer.
    /// Populated at connection time from `vault_entry_id`; never persisted.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub private_key_path: Option<String>,
    /// Reference to a vault entry that holds the private key.
    /// Persisted with the host; resolved to `private_key_path` before connecting.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub vault_entry_id: Option<String>,
    /// Reference to a vault entry that holds the public key (optional, for cert-based auth).
    /// Persisted with the host; resolved to `public_key_path` before connecting.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub public_key_vault_entry_id: Option<String>,
    /// Resolved file-system path for the public key, populated at connection time.
    /// Never persisted.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub public_key_path: Option<String>,
    /// Passphrase for the private key, supplied by the user at connect time.
    /// Never persisted to disk; lives in memory only for the duration of the connection.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub key_passphrase: Option<String>,
    pub tags: Vec<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum AuthMethod {
    Password,
    PrivateKey,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Credential {
    pub host_id: String,
    pub secret: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub host_id: String,
    pub status: SessionStatus,
    pub connected_at: Option<DateTime<Utc>>,
    pub latency_ms: Option<u64>,
    pub current_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum SessionStatus {
    Connecting,
    Connected,
    Disconnected,
    Error,
}

impl Default for Session {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            host_id: String::new(),
            status: SessionStatus::Connecting,
            connected_at: None,
            latency_ms: None,
            current_path: "/".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub entry_type: FileEntryType,
    pub size: u64,
    pub permissions: String,
    pub modified_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum FileEntryType {
    File,
    Directory,
    Symlink,
}
