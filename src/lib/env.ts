/**
 * Server-only environment access.
 *
 * Why this exists instead of plain `process.env.FOO` constants:
 *
 *   1. Lazy reads. A module-level `const X = process.env.FOO` is evaluated
 *      once, the first time the module is imported. Reading inside a function
 *      means the value always comes from the process that is actually serving
 *      the request (local `next dev`, `next start`, or a Vercel function).
 *
 *   2. Bracket access (`process.env[name]`) is not statically replaced by the
 *      bundler, so the value can never be frozen into the build output.
 *
 *   3. Trimming protects against the classic copy/paste bug where a variable
 *      saved in the Vercel dashboard carries a trailing newline or space.
 *
 * Never import this from a `"use client"` module — these values are secrets
 * and are only meant to exist on the server.
 */
export function serverEnv(name: string): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}
