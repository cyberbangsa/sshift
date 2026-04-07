pub mod sftp_client;
pub mod sftp_worker;
pub mod ssh_client;
pub mod ssh_manager;

pub use sftp_worker::{SftpCommand, TransferProgress};
pub use ssh_manager::SshManager;

/// Reads a private key file and converts it to a PEM string that libssh2's
/// OpenSSL backend can handle via `userauth_pubkey_memory`.
///
/// The root problem: libssh2 bundles its own OpenSSH private key parser but its
/// bcrypt KDF implementation fails to decrypt Ed25519 (and other modern)
/// OpenSSH-format keys on some macOS/OpenSSL builds.  We work around this by
/// decrypting the key ourselves using the `ssh-key` pure-Rust crate, then
/// re-serialising the key as an *unencrypted* OpenSSH armoured string.  libssh2\
/// handles the unencrypted variant reliably; it only breaks on the bcrypt step.
///
/// Returns `(pem_for_libssh2, passphrase_for_libssh2)`.
/// When we decrypt the key the returned passphrase is `None` (already consumed).
/// For non-OpenSSH keys the file content and original passphrase are forwarded
/// unchanged so libssh2 can handle them itself.
pub fn decode_key_for_libssh2(
    path: &str,
    passphrase: Option<&str>,
) -> Result<(String, Option<String>), String> {
    let raw = std::fs::read_to_string(path)
        .map_err(|e| format!("Could not read key file: {e}"))?;

    // pem-rfc7468 (used by ssh-key) rejects any trailing bytes after the
    // post-encapsulation boundary, including extra newlines.  Always trim.
    let content = raw.trim();

    // Only OpenSSH-armored keys need special handling.
    if !content.contains("BEGIN OPENSSH PRIVATE KEY") {
        return Ok((content.to_owned(), passphrase.map(str::to_owned)));
    }

    use ssh_key::PrivateKey;

    let parsed = PrivateKey::from_openssh(content)
        .map_err(|e| format!("Key parse error: {e}"))?;

    let decrypted = if parsed.is_encrypted() {
        let pp = passphrase.unwrap_or("");
        if pp.is_empty() {
            // Signal that a passphrase is needed — frontend will prompt the user.
            return Err("bcrypted without passphrase".to_string());
        }
        parsed
            .decrypt(pp.as_bytes())
            .map_err(|_| "Private key unpack failed (correct password?)".to_string())?
    } else {
        parsed
    };

    // Re-serialise as **unencrypted** OpenSSH PEM.  libssh2 handles the
    // unencrypted OpenSSH format reliably; it only breaks on bcrypt decryption.
    let unencrypted_pem = decrypted
        .to_openssh(Default::default())
        .map_err(|e| format!("Key re-serialisation error: {e}"))?;

    // Passphrase has been consumed by us — pass None to libssh2.
    Ok((unencrypted_pem.to_string(), None))
}
