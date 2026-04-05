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
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

use crate::domain::entities::{AuthMethod, Host, Session, SessionStatus};
use crate::domain::repositories::RepositoryError;
use crate::infrastructure::ssh::sftp_worker::{start_sftp_worker, SftpCommand};

// ── Types ────────────────────────────────────────────────────────────────────

pub enum PtyInput {
    Data(Vec<u8>),
    Resize { cols: u32, rows: u32 },
    Disconnect,
}

struct SessionEntry {
    tx: SyncSender<PtyInput>,
    /// Stored so we can lazily spin up a SFTP worker on demand.
    host: Host,
    password: Option<String>,
    /// Populated on first SFTP request.
    sftp_tx: Option<SyncSender<SftpCommand>>,
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
        // Clone credentials so we can store them in SessionEntry for lazy SFTP reconnect.
        let host_for_entry = host.clone();
        let password_for_entry = password.clone();

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
            .insert(
                session.id.clone(),
                SessionEntry {
                    tx: cmd_tx,
                    host: host_for_entry,
                    password: password_for_entry,
                    sftp_tx: None,
                },
            );

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

    // ── SFTP ─────────────────────────────────────────────────────────────────

    /// Lazily creates the SFTP worker thread for a session (if not yet running)
    /// and returns a clone of the command sender.
    pub fn sftp_tx(
        &self,
        session_id: &str,
        app: &AppHandle,
    ) -> Result<SyncSender<SftpCommand>, RepositoryError> {
        let mut map = self
            .sessions
            .lock()
            .map_err(|e| RepositoryError::Internal(e.to_string()))?;

        let entry = map
            .get_mut(session_id)
            .ok_or_else(|| RepositoryError::NotFound(session_id.to_string()))?;

        if let Some(ref tx) = entry.sftp_tx {
            return Ok(tx.clone());
        }

        // Spin up a new SFTP worker.
        let (result_tx, result_rx) =
            std::sync::mpsc::sync_channel::<Result<SyncSender<SftpCommand>, String>>(1);

        start_sftp_worker(
            entry.host.clone(),
            entry.password.clone(),
            app.clone(),
            result_tx,
        );

        let sftp_sender = result_rx
            .recv_timeout(std::time::Duration::from_secs(15))
            .map_err(|_| RepositoryError::ConnectionFailed("SFTP connection timed out".to_string()))
            .and_then(|r| r.map_err(RepositoryError::ConnectionFailed))?;

        entry.sftp_tx = Some(sftp_sender.clone());
        Ok(sftp_sender)
    }

    /// Disconnect a session and clean up.
    pub fn disconnect(&self, session_id: &str) -> Result<(), RepositoryError> {
        let mut map = self
            .sessions
            .lock()
            .map_err(|e| RepositoryError::Internal(e.to_string()))?;
        if let Some(entry) = map.remove(session_id) {
            let _ = entry.tx.try_send(PtyInput::Disconnect);
            if let Some(sftp_tx) = entry.sftp_tx {
                let _ = sftp_tx.try_send(SftpCommand::Disconnect);
            }
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
                let pub_key = host.public_key_path.as_deref().map(Path::new);
                let passphrase = host.key_passphrase.as_deref();
                ssh.userauth_pubkey_file(&host.username, pub_key, Path::new(path), passphrase)
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

    // Ask the server to send SSH keepalive messages every 30 s.
    // We also call keepalive_send() manually in the loop for the client side.
    ssh.set_keepalive(true, 30);

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
    let poll_sleep = Duration::from_millis(5);
    // Send an SSH-level keepalive every 25 s to prevent server-side timeouts.
    let keepalive_interval = Duration::from_secs(25);
    let mut last_keepalive = Instant::now();
    // Require EOF to be observed this many consecutive idle iterations before
    // we treat it as a genuine close.  libssh2 can transiently report eof()
    // between bursts of output; the counter prevents a false positive from
    // killing a live session.
    let mut consecutive_eof: u32 = 0;
    const EOF_CONFIRM_ITERS: u32 = 10;

    loop {
        // 0. Send SSH keepalive if due
        if last_keepalive.elapsed() >= keepalive_interval {
            ssh.set_blocking(true);
            let _ = ssh.keepalive_send();
            ssh.set_blocking(false);
            last_keepalive = Instant::now();
        }

        // 1. Drain all pending input commands before reading output
        loop {
            match cmd_rx.try_recv() {
                Ok(PtyInput::Data(data)) => {
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

        // 2. Read ALL available output FIRST — never check EOF before draining.
        //    In libssh2 non-blocking mode eof() can be set while data is still
        //    buffered; reading first ensures we never drop output.
        let mut got_data = false;
        loop {
            match channel.read(&mut buf) {
                Ok(n) if n > 0 => {
                    got_data = true;
                    let _ = app.emit(
                        &format!("terminal-output:{session_id}"),
                        buf[..n].to_vec(),
                    );
                }
                // libssh2 EAGAIN surfaces as any of these — break and sleep.
                Err(e) if matches!(
                    e.kind(),
                    std::io::ErrorKind::WouldBlock
                        | std::io::ErrorKind::TimedOut
                        | std::io::ErrorKind::Interrupted
                ) => break,
                Err(_) => {
                    // Genuine I/O error — connection dropped.
                    let _ = app.emit(&format!("terminal-closed:{session_id}"), -1i32);
                    return;
                }
                // Ok(0) means no bytes this round (or channel EOF in libssh2).
                _ => break,
            }
        }

        // 3. Check for genuine channel close AFTER draining all data.
        //    Only act when the channel says both eof() AND is_closed(), or when
        //    eof() has been consistently true for several idle iterations.
        if got_data {
            consecutive_eof = 0; // reset: we're still receiving output
        } else if channel.eof() {
            consecutive_eof += 1;
            if consecutive_eof >= EOF_CONFIRM_ITERS {
                // Drain any final bytes one more time before closing.
                while let Ok(n) = channel.read(&mut buf) {
                    if n == 0 { break; }
                    let _ = app.emit(
                        &format!("terminal-output:{session_id}"),
                        buf[..n].to_vec(),
                    );
                }
                let exit_code = channel.exit_status().unwrap_or(0);
                let _ = app.emit(&format!("terminal-closed:{session_id}"), exit_code);
                return;
            }
        } else {
            consecutive_eof = 0;
        }

        std::thread::sleep(poll_sleep);
    }
}
