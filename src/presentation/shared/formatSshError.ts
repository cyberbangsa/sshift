/**
 * Returns true when the raw error string indicates the private key is
 * passphrase-protected and the passphrase was not supplied (or was wrong).
 *
 * libssh2 reports different errors depending on the key type and backend:
 *  - RSA/PEM keys      : "Callback returned error" (Session -19, LIBSSH2_ERROR_DECRYPT)
 *  - Ed25519/OpenSSH   : "bcrypted without passphrase" when no passphrase given
 *                        "Private key unpack failed (correct password?)" when wrong passphrase
 *                        Both map to Session -48 (LIBSSH2_ERROR_KEYFILE_AUTH_FAILED)
 */
export function isPassphraseError(raw: string): boolean {
  return (
    /callback returned error/i.test(raw) ||
    /bcrypted without passphrase/i.test(raw) ||
    /private key unpack failed/i.test(raw) ||
    /\[Session\(-48\)\]/i.test(raw)
  )
}

/**
 * Transforms raw SSH/Tauri error strings into short, human-readable messages.
 * Raw messages come from libssh2 via the Rust backend and look like:
 *   "Authentication failed: Auth failed for 'user': [Session(-19)] Callback returned error"
 *   "Connection failed: Connection refused (os error 111)"
 */
export function formatSshError(raw: string): string {
  const msg = raw.trim()

  // ── Vault / key-file resolution errors ────────────────────────────────────
  if (/vault entry not found/i.test(msg)) {
    return 'SSH key not found in vault. Re-add the key via the Vault page and update the host.'
  }
  if (/public key vault entry not found/i.test(msg)) {
    return 'Public key not found in vault. Re-add the key via the Vault page and update the host.'
  }
  if (/private key path (is )?required/i.test(msg)) {
    return 'No private key configured for this host. Edit the host and select a key from the Vault.'
  }

  // ── Authentication failures ────────────────────────────────────────────────
  if (/authentication failed/i.test(msg) || /auth failed/i.test(msg)) {
    // libssh2 "Callback returned error" — RSA/PEM key passphrase issue
    if (/callback returned error/i.test(msg)) {
      return 'Could not read the private key file. The key may be passphrase-protected, corrupted, or in an unsupported format.'
    }
    // Ed25519/OpenSSH bcrypt key: no passphrase supplied
    if (/bcrypted without passphrase/i.test(msg)) {
      return 'This key requires a passphrase. Please re-connect and enter the passphrase when prompted.'
    }
    // Ed25519/OpenSSH bcrypt key: passphrase was wrong (Session -48)
    if (/private key unpack failed/i.test(msg) || /\[Session\(-48\)\]/i.test(msg)) {
      return 'Incorrect passphrase for the private key. Please try connecting again.'
    }
    // Server-side rejection:
    //  - LIBSSH2_ERROR_AUTHENTICATION_FAILED (-14): probe rejected / final FAILURE
    //    → messages: "Username/PublicKey combination invalid"
    //                or fallback "authentication failed" (from ssh2-rs from_errno)
    //  - LIBSSH2_ERROR_PUBLICKEY_UNVERIFIED (-19): signing callback failed or
    //    server rejected signed packet
    //    → messages: "Invalid signature for supplied public key, or bad username/public key combination"
    //                "public key unverified" (from ssh2-rs from_errno)
    //                "Callback returned error" (signing callback failure)
    //  Also catch "Permission denied, publickey" from OpenSSH servers.
    if (
      /\[Session\(-(?:14|19)\)\]/i.test(msg) ||
      /permission denied/i.test(msg) ||
      /publickey/i.test(msg) ||
      /public[\s_]?key/i.test(msg) ||
      /invalid signature/i.test(msg) ||
      /username\/public/i.test(msg)
    ) {
      return "The server rejected the key. Make sure the correct public key is added to the server's authorized_keys."
    }
    // Password authentication failed
    if (/password/i.test(msg)) {
      return 'Incorrect password. Please check your credentials and try again.'
    }
    // Generic auth failure
    return 'Authentication failed. Check that the correct key is selected and that it is authorised on the server.'
  }

  // ── Connection / network errors ────────────────────────────────────────────
  if (/connection failed/i.test(msg) || /handshake/i.test(msg)) {
    if (/connection refused/i.test(msg)) {
      return 'Connection refused. Check that the host is reachable and SSH is running on the specified port.'
    }
    if (/timed out|timeout/i.test(msg)) {
      return 'Connection timed out. The host may be unreachable or a firewall is blocking the port.'
    }
    if (/no route to host/i.test(msg)) {
      return 'No route to host. Check the hostname/IP address and your network connection.'
    }
    if (/name or service not known|could not resolve/i.test(msg)) {
      return 'Could not resolve hostname. Check the hostname and your DNS settings.'
    }
    if (/handshake/i.test(msg)) {
      return 'SSH handshake failed. The host may not be running an SSH server on this port.'
    }
    return 'Could not connect to the host. Check the hostname, port, and that the server is online.'
  }

  // ── Fallback: strip noisy libssh2 session codes like "[Session(-19)]" ─────
  return msg
    .replace(/\[Session\(-?\d+\)\]\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
