use async_trait::async_trait;

use super::entities::{FileEntry, Host, Session};

#[cfg(test)]
use mockall::automock;

#[cfg_attr(test, automock)]
#[async_trait]
pub trait HostRepository: Send + Sync {
    async fn get_all(&self) -> Result<Vec<Host>, RepositoryError>;
    async fn get_by_id(&self, id: &str) -> Result<Option<Host>, RepositoryError>;
    async fn save(&self, host: &Host) -> Result<(), RepositoryError>;
    async fn delete(&self, id: &str) -> Result<(), RepositoryError>;
}

#[cfg_attr(test, automock)]
#[async_trait]
pub trait SessionRepository: Send + Sync {
    async fn connect(&self, host: &Host) -> Result<Session, RepositoryError>;
    async fn disconnect(&self, session_id: &str) -> Result<(), RepositoryError>;
    async fn execute_command(
        &self,
        session_id: &str,
        command: &str,
    ) -> Result<String, RepositoryError>;
}

#[cfg_attr(test, automock)]
#[async_trait]
pub trait FileRepository: Send + Sync {
    async fn list_directory(
        &self,
        session_id: &str,
        path: &str,
    ) -> Result<Vec<FileEntry>, RepositoryError>;
    async fn delete_file(&self, session_id: &str, path: &str) -> Result<(), RepositoryError>;
    async fn rename_file(
        &self,
        session_id: &str,
        old_path: &str,
        new_path: &str,
    ) -> Result<(), RepositoryError>;
}

#[derive(Debug, thiserror::Error)]
pub enum RepositoryError {
    #[error("Connection failed: {0}")]
    ConnectionFailed(String),
    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),
    #[error("Command execution failed: {0}")]
    CommandFailed(String),
    #[error("File operation failed: {0}")]
    FileOperationFailed(String),
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Internal error: {0}")]
    Internal(String),
}

impl Serialize for RepositoryError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

use serde::Serialize;
