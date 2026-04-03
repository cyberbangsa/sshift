/// SshManager — owns all SSH sessions as persistent per-session threads.
/// Each session runs in its own std::thread that owns the ssh2 Session + Channel
/// (solving ssh2's lifetime constraints). Commands are sent via SyncSender; output
/// is streamed back to the frontend via Tauri events.
use ssh2::Session as Ssh2Session;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::sync::mpsc::{sync_channel, Receiver, SyncSender, TryRecvError};
use tauri::{AppHandle, Emitter};

use crate::domain::entities::{AuthMethod, Host, Session, SessionStatus};
use crate::domain::repositories::RepositoryError;

// ── Types ────────────────────────────────────────────────────────────────────

pub enum PtyInput {
    Data(Vec<u8>),
    Resize { cols: u32, rows: u32 },
    Disconnect,
}

struct SessionEntry {
    tx: SyncSender<PtyInput>,
}

// ── SshManager ───────────────────────────────────────────────────────────────

pub struct SshManager {
    sessions: Arc<Mutex<HashMap<String, SessionEntry>>>,
}

impl SshManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Connect to a host, open a PTY shell, and start streaming output events.
    /// Returns the Session once the PTY is ready (before any shell output).
    pub async fn connect(
        &self,
        host: Host,
        password: Option<String>,
        app: AppHandle,
    ) -> Result<Session, RepositoryError> {
        // One-shot result channel (connect thread → this async fn)
        let (result_tx, result_rx) = sync_channel::<Result<Session, RepositoryError>>(1);
        // Bounded command channel (Tauri commands → session thread)
        let (cmd_tx, cmd_rx) = sync_channel::<PtyInput>(256);

        std::thread::spawn(move || {
            connection_thread(host, password, app, cmd_rx, result_tx);
        });

        // Await connection result without blocking the tokio executor
        let session = tokio::task::spawn_blocking(move || {
            result_rx
                .recv_timeout(std::time::Duration::from_secs(30))
                .map_err(|_| {
                    RepositoryError::ConnectionFailed("Connection timed out (30s)".to_string())
                })
                .and_then(|r| r)
        })
        .await
        .map_err(|e| RepositoryError::Internal(e.to_string()))??;

        self.sessions
            .lock()
            .map_err(|e| RepositoryError::Internal(e.to_string()))?
            .insert(session.id.clone(), SessionEntry { tx: cmd_tx });

        Ok(session)
    }

    /// Send raw bytes to the PTY stdin (keyboard input).
    pub fn write_to_pty(&self, session_id: &str, data: Vec<u8>) -> Result<(), RepositoryError> {
        let map = self
            .sessions
            .lock()
            .map_err(|e| RepositoryError::Internal(e.to_string()))?;
        let entry = map
            .get(session_id)
            .ok_or_else(|| RepositoryError::NotFound(session_id.to_string()))?;
        // Fire-and-forget: if queue is full (shouldn't happen for keystrokes), drop the message
        let _ = entry.tx.try_send(PtyInput::Data(data));
        Ok(())
    }

    /// Notify the PTY of a terminal resize.
    pub fn resize_pty(&self, session_id: &str, cols: u32, rows: u32) -> Result<(), RepositoryError> {
        let map = self
            .sessions
            .lock()
            .map_err(|e| RepositoryError::Internal(e.to_string()))?;
        let entry = map
            .get(session_id)
            .ok_or_else(|| RepositoryError::NotFound(session_id.to_string()))?;
        let _ = entry.tx.try_send(PtyInput::Resize { cols, rows });
        Ok(())
    }

    /// Disconnect a session and clean up.
    pub fn disconnect(&self, session_id: &str) -> Result<(), RepositoryError> {
        let mut map = self
            .sessions
            .lock()
            .map_err(|e| RepositoryError::Internal(e.to_string()))?;
        if let Some(entry) = map.remove(session_id) {
            // Signal the session thread to close the channel
            let _ = entry.tx.try_send(PtyInput::Disconnect);
        }
        Ok(())
    }
}

// ── Per-session thread ────────────────────────────────────────────────────────

/// Runs entirely in a std::thread so that Ssh2Session and Channel share a stack
/// frame — no self-referential lifetime problems.
fn connection_thread(
    host: Host,
    password: Option<String>,
    app: AppHandle,
    cmd_rx: Receiver<PtyInput>,
    result_tx: SyncSender<Result<Session, RepositoryError>>,
) {
    // ── TCP + SSH handshake ───────────────────────────────────────────────────
    let addr = format!("{}:{}", host.hostname, host.port);
    let tcp = match TcpStream::connect(&addr) {
        Ok(t) => t,
        Err(e) => {
            let _ = result_tx.send(Err(RepositoryError::ConnectionFailed(format!(
                "TCP connect to {addr}: {e}"
            ))));
            return;
        }
    };

    let mut ssh = match Ssh2Session::new() {
        Ok(s) => s,
        Err(e) => {
            let _ = result_tx.send(Err(RepositoryError::ConnectionFailed(e.to_string())));
            return;
        }
    };

    ssh.set_tcp_stream(tcp);
    if let Err(e) = ssh.handshake() {
        let _ = result_tx.send(Err(RepositoryError::ConnectionFailed(format!(
            "Handshake: {e}"
        ))));
        return;
    }

    // ── Authentication ────────────────────────────────────────────────────────
    let auth_result = match &host.auth_method {
        AuthMethod::Password => {
            let pw = password.as_deref().unwrap_or("");
            ssh.userauth_password(&host.username, pw)
        }
        AuthMethod::PrivateKey => match host.private_key_path.as_deref() {
            None => {
                let _ = result_tx.send(Err(RepositoryError::AuthenticationFailed(
                    "Private key path is required".to_string(),
                )));
                return;
            }
            Some(path) => {
                ssh.userauth_pubkey_file(&host.username, None, Path::new(path), None)
            }
        },
    };

    if let Err(e) = auth_result {
        let _ = result_tx.send(Err(RepositoryError::AuthenticationFailed(format!(
            "Auth failed for '{}': {e}",
            host.username
        ))));
        return;
    }

    // ── PTY shell channel ──────────────────────────────────────────────────────
    let mut channel = match ssh.channel_session() {
        Ok(c) => c,
        Err(e) => {
            let _ = result_tx.send(Err(RepositoryError::ConnectionFailed(format!(
                "channel_session: {e}"
            ))));
            return;
        }
    };

    if let Err(e) = channel.request_pty("xterm-256color", None, Some((220, 50, 0, 0))) {
        let _ = result_tx.send(Err(RepositoryError::ConnectionFailed(format!(
            "request_pty: {e}"
        ))));
        return;
    }

    if let Err(e) = channel.shell() {
        let _ = result_tx.send(Err(RepositoryError::ConnectionFailed(format!(
            "shell: {e}"
        ))));
        return;
    }

    // ── Signal success ────────────────────────────────────────────────────────
    let session_id = uuid::Uuid::new_v4().to_string();
    let session = Session {
        id: session_id.clone(),
        host_id: host.id.clone(),
        status: SessionStatus::Connected,
        connected_at: Some(chrono::Utc::now()),
        latency_ms: None,
        current_path: "/".to_string(),
    };
    let _ = result_tx.send(Ok(session));
    // result_tx is now dropped — any send attempt from here panics

    // ── Event loop ────────────────────────────────────────────────────────────
    // Non-blocking reads: returns EAGAIN/WouldBlock immediately when no data.
    ssh.set_blocking(false);

    let mut buf = vec![0u8; 8192];
    let poll_sleep = std::time::Duration::from_millis(5);

    loop {
        // 1. Drain all pending input commands before reading output
        loop {
            match cmd_rx.try_recv() {
                Ok(PtyInput::Data(data)) => {
                    // Temporarily blocking to guarantee full write
                    ssh.set_blocking(true);
                    let _ = channel.write_all(&data);
                    let _ = channel.flush();
                    ssh.set_blocking(false);
                }
                Ok(PtyInput::Resize { cols, rows }) => {
                    ssh.set_blocking(true);
                    let _ = channel.request_pty_size(cols, rows, None, None);
                    ssh.set_blocking(false);
                }
                Ok(PtyInput::Disconnect) | Err(TryRecvError::Disconnected) => {
                    let _ = channel.send_eof();
                    let _ = channel.close();
                    return;
                }
                Err(TryRecvError::Empty) => break,
            }
        }

        // 2. Check for remote EOF / shell exit
        if channel.eof() {
            let _ = app.emit(&format!("terminal-closed:{session_id}"), "");
            return;
        }

        // 3. Read available output (non-blocking — returns immediately)
        match channel.read(&mut buf) {
            Ok(n) if n > 0 => {
                let _ = app.emit(
                    &format!("terminal-output:{session_id}"),
                    buf[..n].to_vec(),
                );
            }
            _ => {} // WouldBlock, EAGAIN, or empty — expected in non-blocking mode
        }

        std::thread::sleep(poll_sleep);
    }
}
