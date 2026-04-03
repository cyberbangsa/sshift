use super::entities::{Host, Session, SessionStatus};
use super::repositories::{RepositoryError, SessionRepository};
use chrono::Utc;
use std::sync::Arc;

/// Validates host configuration and establishes an SSH connection.
pub struct ConnectSession {
    session_repo: Arc<dyn SessionRepository>,
}

impl ConnectSession {
    pub fn new(session_repo: Arc<dyn SessionRepository>) -> Self {
        Self { session_repo }
    }

    pub async fn execute(&self, host: &Host) -> Result<Session, ConnectSessionError> {
        if host.hostname.is_empty() || host.username.is_empty() {
            return Err(ConnectSessionError::InvalidHost(
                "Host must have a hostname and username".to_string(),
            ));
        }

        if host.port == 0 {
            return Err(ConnectSessionError::InvalidHost(format!(
                "Invalid port: {}",
                host.port
            )));
        }

        let session = self
            .session_repo
            .connect(host)
            .await
            .map_err(|e| ConnectSessionError::ConnectionFailed(e.to_string()))?;

        Ok(Session {
            status: SessionStatus::Connected,
            connected_at: Some(Utc::now()),
            ..session
        })
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ConnectSessionError {
    #[error("Invalid host configuration: {0}")]
    InvalidHost(String),
    #[error("Connection failed: {0}")]
    ConnectionFailed(String),
}

/// Disconnects an active SSH session.
pub struct DisconnectSession {
    session_repo: Arc<dyn SessionRepository>,
}

impl DisconnectSession {
    pub fn new(session_repo: Arc<dyn SessionRepository>) -> Self {
        Self { session_repo }
    }

    pub async fn execute(&self, session_id: &str) -> Result<(), RepositoryError> {
        self.session_repo.disconnect(session_id).await
    }
}

/// Lists the contents of a remote directory, sorted with directories first.
pub struct ListFiles {
    file_repo: Arc<dyn super::repositories::FileRepository>,
}

impl ListFiles {
    pub fn new(file_repo: Arc<dyn super::repositories::FileRepository>) -> Self {
        Self { file_repo }
    }

    pub async fn execute(
        &self,
        session_id: &str,
        path: &str,
    ) -> Result<Vec<super::entities::FileEntry>, RepositoryError> {
        let mut entries = self.file_repo.list_directory(session_id, path).await?;
        entries.sort_by(|a, b| {
            use super::entities::FileEntryType;
            match (&a.entry_type, &b.entry_type) {
                (FileEntryType::Directory, FileEntryType::Directory) => a.name.cmp(&b.name),
                (FileEntryType::Directory, _) => std::cmp::Ordering::Less,
                (_, FileEntryType::Directory) => std::cmp::Ordering::Greater,
                _ => a.name.cmp(&b.name),
            }
        });
        Ok(entries)
    }
}

/// Executes a command on a remote session.
pub struct ExecuteCommand {
    session_repo: Arc<dyn SessionRepository>,
}

impl ExecuteCommand {
    pub fn new(session_repo: Arc<dyn SessionRepository>) -> Self {
        Self { session_repo }
    }

    pub async fn execute(
        &self,
        session_id: &str,
        command: &str,
    ) -> Result<String, RepositoryError> {
        self.session_repo.execute_command(session_id, command).await
    }
}
