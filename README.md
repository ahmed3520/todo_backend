# Todo API Backend

## Refresh Token Strategy

- **Current approach**
  - Refresh tokens are stateless JWTs signed with `JWT_CONFIG.refreshSecret`.
  - `authService.refresh()` verifies the token via `verifyRefreshToken()` and reissues a new access/refresh pair without persisting token state.
  - **Trade-offs**
    - ✅ Simple to scale (no shared storage, just signature verification)
    - ❌ Cannot revoke a single refresh token or detect reuse if the token is stolen
    - ❌ Compromised refresh tokens remain valid until expiry or secret rotation

- **Mitigations without storage**
  - Serve over HTTPS and store tokens in HTTP-only, Secure cookies to reduce theft risk.
  - Shorten `JWT_REFRESH_TTL` to narrow the attack window.
  - Rotate JWT secrets on credential compromise.

- **Redis-backed improvement**
  - Store hashed refresh tokens in Redis keyed by user/session.
  - On refresh:
    - Verify JWT signature.
    - Check Redis entry for existence and metadata (e.g., device fingerprint, issuedAt).
    - Rotate token by deleting the old entry and writing the new one.
  - **Benefits**
    - ✅ Per-token revocation (delete Redis key)
    - ✅ Detect reuse: if a token is presented after it was rotated, mark the session compromised.
    - ✅ Enable concurrent session management and manual logout.
  - **Costs**
    - ❌ Requires deploying & managing Redis
    - ❌ Additional complexity and network latency

- **Recommended path for production**
  - Combine Secure cookies + HTTPS with Redis-backed refresh token storage.
  - Implement reuse detection that invalidates all sessions if a refresh token is replayed.
  - Consider device-bound metadata (user-agent/IP) to strengthen session validation.

## Service Design Notes

- **[auth.service.ts](src/services/auth.service.ts)**
  - We centralize sign/verify logic via `signTokens()` / `verifyRefreshToken()` to keep controller layers lean. `createUser()` and `authenticateUser()` return consistent `AuthenticatedUser` payloads to satisfy the contract that responses include `id`, `displayName`, `accessToken`, and `refreshToken`.
  - Trade-off: password checks and token issuance remain synchronous DB calls, which simplifies transactions but may bottleneck under heavy traffic; we accepted this for clarity over introducing background queues.
- **[upload.service.ts](src/services/upload.service.ts)**
  - File storage defaults to an on-disk `uploads/` directory created lazily via `ensureUploadsDirectory()`. `mapToUploadedImageInfo()` standardizes the shape returned to clients.
  - Trade-off: local disk is simple for development/tests but lacks horizontal scalability. We can swap `buildPublicUrl()` to point to S3/CDN later without touching controllers.

