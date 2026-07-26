/**
 * UUID generation utility
 * Uses crypto.randomUUID() which is available in modern Node.js, Bun, and browsers
 */

/**
 * Generates a random UUID v4
 * Uses native crypto.randomUUID() for best performance and randomness
 * Falls back to manual generation if not available
 */
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // Fallback for environments without crypto.randomUUID
  // Generates a UUID v4 compliant string
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
