# Design

## Context

See proposal.md for motivation and the three delta specs for behavior. Inspection found only OpenSpec scaffolding: no application code, package manifests, tests, documentation, or main capability specs. The configured workflow is spec-driven with no additional project context. All application paths below are proposed additions.

The user selected NestJS/TypeScript with modular architecture, class-validator, React/TypeScript/Vite with feature-based architecture, local MinIO, webcam capture in both flows, profile-only login output, and no sessions or automated tests.

## Goals / Non-Goals

**Goals:** Keep account persistence and biometric providers behind clear modules; enforce both factors at the backend; make local setup small and repeatable; keep the UI limited to the requested flows.

**Non-Goals:** Establishing an authenticated session or protecting future resources, proving legal identity, detecting presentation attacks, or adding account lifecycle features. Webcam capture is the browser input method; an image endpoint cannot prove that bytes came from a live camera.

## Decisions

### 1. Two applications with explicit module and feature boundaries

Use npm workspaces with `api/` for the backend and `web/` for the frontend directly inside the DemoID project root, a root lockfile, and explicit build/typecheck scripts. There is no `apps/` wrapper directory. Select compatible stable dependency versions at implementation and pin them in the lockfile. Use a supported Node LTS satisfying both tools' engine requirements. Avoid extra orchestration frameworks for this small repository.

The backend contains ConfigModule, DatabaseModule, UsersModule, RegistrationModule, LoginModule, StorageModule, and BiometricsModule. Controllers handle transport and DTO validation; services coordinate flows; UsersModule owns user persistence and password hashing; StorageModule owns MinIO; BiometricsModule owns Rekognition. Consumers use exported providers instead of reaching into other modules' repositories. Do not scaffold test files or install test frameworks.

The frontend contains `src/app` for the entry and flow selection, `src/features/registration`, `src/features/login`, and `src/features/profile` for feature-owned screens, hooks, and API calls. `src/shared/api`, `src/shared/camera`, and `src/shared/ui` contain the reusable HTTP wrapper, webcam control, and basic form primitives. React state is sufficient; no state management framework or elaborate design system is needed.

### 2. Token-free requests enforce the two checks

Use these contracts, with API prefix `/api`:

| Endpoint | Input | Successful response |
| --- | --- | --- |
| POST /registration/validate | JSON email, password, firstName, lastName, birthDate | 200 `{ valid: true }`; no persistence |
| POST /registration/complete | Multipart same fields plus `photo` | 201 `{ message: "Registration complete" }` |
| POST /login/credentials | JSON email, password | 200 `{ valid: true }` |
| POST /login/verify-face | Multipart email, password, `photo` | 200 flat profile object only |

The profile object contains exactly `{ id, email, firstName, lastName, birthDate }`. The face endpoint verifies credentials again before any reference-image read or biometric API call. It resolves the account and reference key from the verified credentials, never from a client-supplied user id or object key. The first credential endpoint gates the UI but conveys no authorization. A direct request to the final endpoint must independently pass both checks.

This replaces challenge tokens and server-side pending-login sessions. It requires one extra password check and resending the password in the final request, but satisfies the explicit no-token, no-session requirement. The browser retains credentials only in current flow memory and clears them after success, restart, or leaving the flow. No JWT, cookies, browser persistent storage, or profile lookup endpoint is introduced.

### 3. Local account persistence and enrollment consistency

Use SQLite through TypeORM with a persistent database file in `api/data`, an initial schema migration, and schema synchronization disabled. SQLite is a documented default because the user did not request a database and this demo needs no additional database service. PostgreSQL would add setup without improving the requested single-instance demo.

The user table contains UUID id, unique normalized email, passwordHash, firstName, lastName, date-only birthDate, private faceObjectKey, and createdAt. Use Node's asynchronous scrypt with a random per-password salt and a versioned stored encoding of parameters, salt, and hash. Compare derived hashes with a timing-safe comparison. Never trim or normalize passwords. A unique database constraint is the final authority for email conflicts, including concurrent completions.

Step one validates and checks uniqueness without storing anything. Completion repeats those checks, validates the captured image, calls DetectFaces, and requires exactly one face. Generate a new UUID and unguessable object key without personal information; upload the image to the private bucket; then commit the account. Only committed accounts can log in. If insertion fails, delete the just-uploaded object; map uniqueness failures to 409. If cleanup fails, record the key and sanitized failure for operator retry without logging credentials or image bytes. A crash between upload and commit can leave an orphan, addressed by documented reconciliation of bucket keys against committed accounts. Never delete an existing account's photo during a conflicting registration.

### 4. Separate local S3 transport from AWS face analysis

Use AWS SDK v3 S3Client with the local MinIO endpoint, path-style addressing, and dedicated local MinIO credentials. Docker Compose supplies persistent MinIO storage and an idempotent private-bucket initializer. The browser communicates only with the backend; expose neither object URLs nor provider credentials.

Use a separate RekognitionClient with an AWS region and the normal backend AWS credential chain. MinIO credentials and endpoint configuration MUST NOT configure Rekognition. The required AWS IAM actions are `rekognition:DetectFaces` and `rekognition:CompareFaces`; using byte inputs avoids AWS S3 access permissions for this flow.

The backend reads reference bytes from MinIO and sends SourceImage.Bytes and TargetImage.Bytes to CompareFaces. This is an application integration choice based on AWS's supported [image byte input](https://docs.aws.amazon.com/rekognition/latest/APIReference/API_Image.html); a local MinIO object is not an AWS S3 object reference. Reference images stay in local MinIO, while their bytes and candidate bytes are transmitted to AWS for analysis.

Registration uses [DetectFaces](https://docs.aws.amazon.com/rekognition/latest/APIReference/API_DetectFaces.html) with DEFAULT attributes and requires one face. Login uses [CompareFaces](https://docs.aws.amazon.com/rekognition/latest/APIReference/API_CompareFaces.html) with configurable SimilarityThreshold (default 95), and QualityFilter NONE so returned matches and unmatched faces can be counted together. Require exactly one total target face and one qualifying match, and explicitly check its numeric similarity. Empty matches fail; zero-face provider errors become capture errors. Login images are never written to local object storage, disk, or the account database. No Rekognition collections or persistent face indexes are needed.

### 5. Validation and error handling

Use a global Nest ValidationPipe with transformation, whitelisting, rejection of unknown fields, and validationError target/value disabled. DTOs use class-validator and class-transformer for email/name normalization and validation. Validate strict date-only calendar values and dates before the current UTC date; do not silently accept rolled-over dates. Names are 1-100 characters; password bounds are 8-128 characters; email is valid and at most 254 characters. These bounds are documented defaults, not inferred existing behavior.

Use bounded in-memory multipart handling: one photo, limited field lengths/count, no extra files, maximum 5,242,880 photo bytes. Check magic bytes and actual image decoding, not just a caller-supplied MIME type. JPEG and PNG are allowed because those are supported by the face APIs; the browser captures JPEG. Apply the same limits to reference reads. After capture validation, let AWS determine whether a usable face exists.

Return a small stable error shape with a code, safe message, and optional field messages. Use 400 for DTO/format errors, 413 for oversize input, 422 for no/multiple faces, 409 for email conflicts, 401 for generic invalid credentials or a face mismatch with distinct safe error codes, and 503 for database/storage/provider failure. Never return a profile on failure or leak raw AWS errors. Password validation messages may describe constraints but must not echo values. Use generic responses for unknown-email and wrong-password login attempts.

Validate environment configuration on startup, including the threshold range 0-100, required MinIO settings and region, database path, and web origin. Bind CORS to the configured frontend origin. Keep backend secrets out of Vite variables. HTTPS is needed outside localhost; localhost supports browser webcam development.

### 6. Frontend flow and camera lifecycle

Registration states are details, capture, submitting, and completed. Login states are credentials, capture, verifying, and verified profile. Only successful backend first-step responses advance a flow; changing validated details resets that validation. The final multipart submission carries the validated details or login credentials again. Disable repeat submissions while pending.

The shared camera component uses getUserMedia video without audio and a video/canvas capture to a JPEG Blob. Provide preview, capture, retake, back, and submit controls with basic labels and error text. Start capture only on the camera step; stop every track after capture, departure, completion, or component cleanup, and reacquire on retake. Handle permission denial, unavailable/busy cameras, and insecure contexts without a file-upload fallback.

Keep the candidate image for preview and submission only in memory, release object URLs on replacement and unmount, and clear sensitive state when flows end. Face rejection permits recapture; a final credential rejection returns to the first login step. After success, render the five profile fields only; refresh starts at entry again. The UI uses no dashboard, token handling, or durable authenticated state.

## Risks / Trade-offs

- Photo similarity does not establish liveness or verified civil identity -> keep this as the requested photo-matching demo; do not label it document or liveness verification.
- Threshold choice changes false rejection and acceptance behavior -> expose a validated server-side threshold, default 95, and document manual calibration using representative captures. A score is not a guarantee of identity.
- MinIO is local but biometric analysis needs AWS connectivity, credentials, and billable requests -> document this clearly, configure bounded SDK timeouts/retries, and fail closed; no silent mock success.
- No durable session exists -> the profile is a one-time result; future protected resources would require a separate design.
- SQL and object storage have no shared transaction -> create no account before photo storage succeeds and compensate failed inserts; document orphan cleanup after crashes.
- No automated tests are requested -> use build/type checks and a manual acceptance checklist covering success, bypass attempts, invalid images, failures, restarts, and private storage.

## Migration Plan

There is no existing application data to migrate. During implementation, add workspace tooling, apply the initial account migration, start local MinIO and initialize its private bucket, supply backend-only AWS configuration, and run both applications. Document Windows PowerShell commands and camera use on localhost. Keep `.env`, SQLite files, image data, and generated builds out of version control.

Rollback stops the applications and reverts implementation files. Preserve the database and MinIO volume unless the operator explicitly requests a local data reset. No production rollout or deployment is part of this change.
