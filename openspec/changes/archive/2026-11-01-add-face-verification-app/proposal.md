# Proposal

## Why

The repository has no application yet. Build a minimal identity verification demo where users enroll their profile and face, then must pass both an email/password check and a face comparison to receive their profile.

## What Changes

- Add two-step registration: validate email, password, first name, last name, and birth date; then capture a face through the webcam and create the account with a private reference image in local MinIO.
- Add two-step login: validate email/password first, then compare a fresh webcam image against that account's stored reference using AWS Rekognition CompareFaces.
- Return only the user's profile after both login checks succeed. Issue no session tokens, access tokens, authentication cookies, or persistent login state.
- Build a modular NestJS/TypeScript backend with class-validator DTOs and a simple React/TypeScript/Vite frontend organized by feature.
- Persist accounts locally, hash passwords, validate images, handle storage/AWS failures, and provide local setup instructions.
- Include no automated tests, test framework dependencies, or generated test scaffolding; verify builds, types, and documented manual flows instead.

## Capabilities

### New Capabilities

- `user-registration`: Validated profile collection, webcam face enrollment, unique accounts, and durable private storage.
- `biometric-login`: Credential-first login, account-bound face comparison, and a profile-only success response without sessions.
- `verification-interface`: Minimal registration and login screens with webcam capture, step gating, retries, and profile display.

### Modified Capabilities

None. The project has no existing capability specs or application implementation.

## Impact

- New backend and frontend applications, local account database, MinIO development configuration, environment examples, and setup documentation.
- New registration validation/completion and login credential/face-verification HTTP endpoints.
- Dependencies include NestJS, class-validator/class-transformer, local database integration, React, Vite, and AWS SDK clients for S3-compatible storage and Rekognition.
- MinIO stays local; face analysis calls real AWS APIs with image bytes, using backend-only AWS credentials. Registration uses DetectFaces to validate enrollment before storage; login uses CompareFaces.
- Scope excludes automated tests, file upload UI, document verification, liveness detection, email verification, password recovery, account management, dashboards, deployment, and session management.
