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
    // libssh2 "Callback returned error" means it couldn't read/parse the key file
    if (/callback returned error/i.test(msg)) {
      return 'Could not read the private key file. The key may be passphrase-protected, corrupted, or in an unsupported format.'
    }
    // "disconnect" or "Permission denied" from the server
    if (/permission denied/i.test(msg) || /publickey/i.test(msg)) {
      return 'The server rejected the key. Make sure the correct public key is added to the server\'s authorized_keys.'
    }
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
  return msg.replace(/\[Session\(-?\d+\)\]\s*/gi, '').replace(/\s{2,}/g, ' ').trim()
}
