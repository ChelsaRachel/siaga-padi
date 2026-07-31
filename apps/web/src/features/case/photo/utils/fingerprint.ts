/**
 * Client-side photo fingerprint — sha256 hex of the blob bytes.
 *
 * Mirrors the server's content-addressed dedup key (unique per case): a retry
 * MUST re-send the exact same bytes so the server replays the same record.
 * Also used locally to block sending the identical capture twice in-session.
 * Sprint 07 reuses this contract for the offline queue.
 */
export async function fingerprintBlob(blob: Blob): Promise<string> {
  // Re-wrap in a current-realm view: some environments (jsdom) hand back a
  // foreign-realm ArrayBuffer that WebCrypto's type check rejects.
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
