/**
 * [SECURITY/Opus] — site-wide security headers (ARCHITECTURE "Output rendering /
 * transport hardening"). Applied to EVERY Worker response.
 *
 * Phase 0 surface = a JSON health probe plus a static HTML token sheet (served from
 * public/ by the Static Assets binding). The token sheet loads `/tokens.css` and one
 * inline <style> block, so the Phase 0 CSP allows same-origin styles + `'unsafe-inline'`
 * for style only, and `data:` images (the inline SVG favicon). It grants NO script
 * source — the token sheet ships zero JS.
 *
 * The Phase 2 React SPA REPLACES this with a strict per-route CSP: nonce/hash-based,
 * no `unsafe-inline`, and all model/corpus/question text rendered as sanitized markdown
 * (Streamdown, never raw HTML) so no passage, completion, or crafted question can inject
 * script. This module is intentionally small and gets hardened when that surface lands.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Content-Security-Policy":
    "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  // Harmless over plain HTTP (local dev); meaningful once served over HTTPS.
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
});
