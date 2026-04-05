use crate::domain::entities::{AuthMethod, Host, Session, SessionStatus};
use crate::domain::repositories::MockSessionRepository;
use crate::domain::usecases::{ConnectSession, ConnectSessionError};
use chrono::Utc;
use std::sync::Arc;

fn test_host() -> Host {
    Host {
        id: "test-host-1".to_string(),
        label: "Test Server".to_string(),
        hostname: "192.168.1.100".to_string(),
        port: 22,
        username: "testuser".to_string(),
        auth_method: AuthMethod::Password,
        private_key_path: None,
        public_key_vault_entry_id: None,
        public_key_path: None,
        vault_entry_id: None,
        tags: vec!["test".to_string()],
        created_at: Utc::now(),
    }
}

#[tokio::test]
async fn test_connect_session_success() {
    let mut mock_repo = MockSessionRepository::new();
    mock_repo.expect_connect().returning(|host| {
        Ok(Session {
            host_id: host.id.clone(),
            status: SessionStatus::Connected,
            connected_at: Some(Utc::now()),
            ..Session::default()
        })
    });

    let use_case = ConnectSession::new(Arc::new(mock_repo));
    let result = use_case.execute(&test_host()).await;

    assert!(result.is_ok());
    let session = result.unwrap();
    assert_eq!(session.status, SessionStatus::Connected);
    assert_eq!(session.host_id, "test-host-1");
    assert!(session.connected_at.is_some());
}

#[tokio::test]
async fn test_connect_session_failure() {
    let mut mock_repo = MockSessionRepository::new();
    mock_repo
        .expect_connect()
        .returning(|_| {
            Err(crate::domain::repositories::RepositoryError::ConnectionFailed(
                "Connection refused".to_string(),
            ))
        });

    let use_case = ConnectSession::new(Arc::new(mock_repo));
    let result = use_case.execute(&test_host()).await;

    assert!(result.is_err());
    match result.unwrap_err() {
        ConnectSessionError::ConnectionFailed(msg) => {
            assert!(msg.contains("Connection refused"));
        }
        other => panic!("Expected ConnectionFailed, got: {:?}", other),
    }
}

#[tokio::test]
async fn test_connect_session_empty_hostname() {
    let mock_repo = MockSessionRepository::new();
    let use_case = ConnectSession::new(Arc::new(mock_repo));

    let mut host = test_host();
    host.hostname = String::new();

    let result = use_case.execute(&host).await;

    assert!(result.is_err());
    match result.unwrap_err() {
        ConnectSessionError::InvalidHost(msg) => {
            assert!(msg.contains("hostname and username"));
        }
        other => panic!("Expected InvalidHost, got: {:?}", other),
    }
}

#[tokio::test]
async fn test_connect_session_invalid_port() {
    let mock_repo = MockSessionRepository::new();
    let use_case = ConnectSession::new(Arc::new(mock_repo));

    let mut host = test_host();
    host.port = 0;

    let result = use_case.execute(&host).await;

    assert!(result.is_err());
    match result.unwrap_err() {
        ConnectSessionError::InvalidHost(msg) => {
            assert!(msg.contains("Invalid port"));
        }
        other => panic!("Expected InvalidHost, got: {:?}", other),
    }
}
