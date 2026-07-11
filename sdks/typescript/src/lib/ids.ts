/**
 * W3C/OTel-compatible trace and span ID generation.
 *
 * OTLP requires trace IDs of 16 bytes and span IDs of 8 bytes, serialized as
 * lowercase hex (32 and 16 characters). All-zero IDs are invalid.
 */

const HEX_CHARS = "0123456789abcdef";

function randomHex(byteLength: number): string {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(byteLength);
    do {
      crypto.getRandomValues(bytes);
    } while (bytes.every((byte) => byte === 0));
    let hex = "";
    for (const byte of bytes) {
      hex += HEX_CHARS[byte >> 4]! + HEX_CHARS[byte & 0x0f]!;
    }
    return hex;
  }

  let hex = "";
  for (let i = 0; i < byteLength * 2; i += 1) {
    hex += HEX_CHARS[(Math.random() * 16) | 0]!;
  }
  return hex;
}

/** Generates a 32-character hex OTel trace ID. */
export function generateTraceId(): string {
  return randomHex(16);
}

/** Generates a 16-character hex OTel span ID. */
export function generateSpanId(): string {
  return randomHex(8);
}
