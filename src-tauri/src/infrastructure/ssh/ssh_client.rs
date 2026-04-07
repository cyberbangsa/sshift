use async_trait::async_trait;
use ssh2::Session as Ssh2Session;
use std::collections::HashMap;
use std::io::Read;
use std::net::TcpStream;
use std::sync::Mutex;

use crate::domain::entities::{AuthMethod, Host, Session, SessionStatus};
use crate::domain::repositories::{RepositoryError, SessionRepository};

pub struct SshClient {
    sessions: Mutex<HashMap<String, Ssh2Session>>,
}

impl Default for SshClient {
    fn default() -> Self {
        Self::new()
    }
}

impl SshClient {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }
}

#[async_trait]
impl SessionRepository for SshClient {
    async fn connect(&self, host: &Host) -> Result<Session, RepositoryError> {
        let addr = format!("{}:{}", host.hostname, host.port);
        let tcp = TcpStream::connect(&addr)
            .map_err(|e| RepositoryError::ConnectionFailed(e.to_string()))?;

        let mut ssh_session = Ssh2Session::new()
            .map_err(|e| RepositoryError::ConnectionFailed(e.to_string()))?;

        ssh_session.set_tcp_stream(tcp);
        ssh_session
            .handshake()
            .map_err(|e| RepositoryError::ConnectionFailed(e.to_string()))?;

        match &host.auth_method {
            AuthMethod::Password => {
                // Password will be retrieved from credential store
                ssh_session
                    .userauth_password(&host.username, "")
                    .map_err(|e| RepositoryError::AuthenticationFailed(e.to_string()))?;
            }
            AuthMethod::PrivateKey => {
                let key_path = host
                    .private_key_path
                    .as_deref()
                    .ok_or_else(|| {
                        RepositoryError::AuthenticationFailed(
                            "Private key path not provided".to_string(),
                        )
                    })?;
                ssh_session
                    .userauth_pubkey_file(&host.username, None, std::path::Path::new(key_path), None)
                    .map_err(|e| RepositoryError::AuthenticationFailed(e.to_string()))?;
            }
        }

        let session = Session {
            id: uuid::Uuid::new_v4().to_string(),
            host_id: host.id.clone(),
            status: SessionStatus::Connected,
            connected_at: Some(chrono::Utc::now()),
            latency_ms: None,
            current_path: "/".to_string(),
        };

        self.sessions
            .lock()
            .map_err(|e| RepositoryError::Internal(e.to_string()))?
            .insert(session.id.clone(), ssh_session);

        Ok(session)
    }

    async fn disconnect(&self, session_id: &str) -> Result<(), RepositoryError> {
        let mut sessions = self
            .sessions
            .lock()
            .map_err(|e| RepositoryError::Internal(e.to_string()))?;

        if let Some(session) = sessions.remove(session_id) {
            session
                .disconnect(None, "User disconnected", None)
                .map_err(|e| RepositoryError::ConnectionFailed(e.to_string()))?;
        }

        Ok(())
    }

    async fn execute_command(
        &self,
        session_id: &str,
        command: &str,
    ) -> Result<String, RepositoryError> {
        let sessions = self
            .sessions
            .lock()
            .map_err(|e| RepositoryError::Internal(e.to_string()))?;

        let ssh_session = sessions
            .get(session_id)
            .ok_or_else(|| RepositoryError::NotFound(format!("Session {} not found", session_id)))?;

        let mut channel = ssh_session
            .channel_session()
            .map_err(|e| RepositoryError::CommandFailed(e.to_string()))?;

        channel
            .exec(command)
            .map_err(|e| RepositoryError::CommandFailed(e.to_string()))?;

        let mut output = String::new();
        channel
            .read_to_string(&mut output)
            .map_err(|e| RepositoryError::CommandFailed(e.to_string()))?;

        channel
            .wait_close()
            .map_err(|e| RepositoryError::CommandFailed(e.to_string()))?;

        Ok(output)
    }
}
