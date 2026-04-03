use async_trait::async_trait;
use ssh2::Session as Ssh2Session;
use std::collections::HashMap;
use std::sync::Mutex;

use crate::domain::entities::{FileEntry, FileEntryType};
use crate::domain::repositories::{FileRepository, RepositoryError};

pub struct SftpClient {
    sessions: Mutex<HashMap<String, Ssh2Session>>,
}

impl SftpClient {
    pub fn new(sessions: Mutex<HashMap<String, Ssh2Session>>) -> Self {
        Self { sessions }
    }
}

#[async_trait]
impl FileRepository for SftpClient {
    async fn list_directory(
        &self,
        session_id: &str,
        path: &str,
    ) -> Result<Vec<FileEntry>, RepositoryError> {
        let sessions = self
            .sessions
            .lock()
            .map_err(|e| RepositoryError::Internal(e.to_string()))?;

        let ssh_session = sessions
            .get(session_id)
            .ok_or_else(|| RepositoryError::NotFound(format!("Session {} not found", session_id)))?;

        let sftp = ssh_session
            .sftp()
            .map_err(|e| RepositoryError::FileOperationFailed(e.to_string()))?;

        let dir_entries = sftp
            .readdir(std::path::Path::new(path))
            .map_err(|e| RepositoryError::FileOperationFailed(e.to_string()))?;

        let entries = dir_entries
            .into_iter()
            .map(|(path_buf, stat)| {
                let name = path_buf
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                let full_path = path_buf.to_string_lossy().to_string();

                let entry_type = if stat.is_dir() {
                    FileEntryType::Directory
                } else if stat.file_type().is_symlink() {
                    FileEntryType::Symlink
                } else {
                    FileEntryType::File
                };

                let permissions = format!("{:o}", stat.perm.unwrap_or(0));

                FileEntry {
                    name,
                    path: full_path,
                    entry_type,
                    size: stat.size.unwrap_or(0),
                    permissions,
                    modified_at: chrono::DateTime::from_timestamp(stat.mtime.unwrap_or(0) as i64, 0)
                        .unwrap_or_default(),
                }
            })
            .collect();

        Ok(entries)
    }

    async fn delete_file(&self, session_id: &str, path: &str) -> Result<(), RepositoryError> {
        let sessions = self
            .sessions
            .lock()
            .map_err(|e| RepositoryError::Internal(e.to_string()))?;

        let ssh_session = sessions
            .get(session_id)
            .ok_or_else(|| RepositoryError::NotFound(format!("Session {} not found", session_id)))?;

        let sftp = ssh_session
            .sftp()
            .map_err(|e| RepositoryError::FileOperationFailed(e.to_string()))?;

        sftp.unlink(std::path::Path::new(path))
            .map_err(|e| RepositoryError::FileOperationFailed(e.to_string()))?;

        Ok(())
    }

    async fn rename_file(
        &self,
        session_id: &str,
        old_path: &str,
        new_path: &str,
    ) -> Result<(), RepositoryError> {
        let sessions = self
            .sessions
            .lock()
            .map_err(|e| RepositoryError::Internal(e.to_string()))?;

        let ssh_session = sessions
            .get(session_id)
            .ok_or_else(|| RepositoryError::NotFound(format!("Session {} not found", session_id)))?;

        let sftp = ssh_session
            .sftp()
            .map_err(|e| RepositoryError::FileOperationFailed(e.to_string()))?;

        sftp.rename(
            std::path::Path::new(old_path),
            std::path::Path::new(new_path),
            None,
        )
        .map_err(|e| RepositoryError::FileOperationFailed(e.to_string()))?;

        Ok(())
    }
}
