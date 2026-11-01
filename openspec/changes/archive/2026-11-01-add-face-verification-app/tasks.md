# Tasks

## 1. Workspace and application foundations

- [x] 1.1 Create npm workspaces for backend `api/` and frontend `web/` directly inside the DemoID project root, scaffold NestJS/TypeScript and React/TypeScript/Vite with the planned module/feature folders, and add build/typecheck/dev scripts; verify dependency installation and both initial builds without generating tests or adding test dependencies.
- [x] 1.2 Add backend environment validation, `/api` prefix, configured CORS origin, sanitized error responses, and global class-validator ValidationPipe settings; verify startup rejects missing configuration and malformed or unknown request fields return safe errors without echoed passwords.
- [x] 1.3 Add environment examples, ignore rules, and root setup instructions covering supported Node/npm versions and Windows PowerShell commands; verify secrets, SQLite files, generated output, and image data are excluded and the documented startup commands match workspace scripts.

## 2. Account persistence and password validation

- [x] 2.1 Add DatabaseModule and UsersModule using SQLite/TypeORM, the user entity, initial migration, and unique normalized-email constraint; verify the migration runs on a fresh database and accounts persist across a restart.
- [x] 2.2 Implement salted asynchronous scrypt password hashing and credential verification without password normalization; verify manually that correct credentials pass, wrong and unknown credentials get the same generic response, and stored data contains only versioned hashes.
- [x] 2.3 Add reusable registration and login DTOs with email/name normalization, strict calendar birth-date validation, documented length bounds, and rejected unknown fields; verify manually with invalid dates, future dates, whitespace, missing fields, and out-of-range values.
- [x] 2.4 Document the database location, migration commands, field constraints, and handling of local account data; verify the documented migration command works on a fresh local database without schema synchronization.

## 3. Local MinIO and AWS biometrics providers

- [x] 3.1 Add Docker Compose MinIO persistence and idempotent private-bucket initialization with environment-driven credentials; verify startup twice preserves existing objects and an anonymous object GET is denied.
- [x] 3.2 Implement StorageModule with a MinIO-specific AWS SDK S3Client for bounded byte reads, writes, and deletes; verify a local image can be written, read back unchanged, and deleted using backend-only credentials.
- [x] 3.3 Implement bounded in-memory multipart/photo validation for one nonempty decodable JPEG/PNG up to 5,242,880 bytes; verify manually that empty, oversized, mislabeled, corrupt, unsupported, and extra-file requests are rejected without persisting images.
- [x] 3.4 Implement BiometricsModule with a separate AWS RekognitionClient, single-face DetectFaces enrollment validation, and byte-based CompareFaces login with a validated configurable threshold defaulting to 95; verify with real AWS responses that a single face is accepted for enrollment and matching, mismatching, no-face, and multiple-face captures produce the specified outcomes.
- [x] 3.5 Add bounded AWS timeouts/retries and sanitized provider-error mapping; verify unavailable MinIO, missing reference objects, denied AWS access, and failed Rekognition requests cannot produce success or reveal provider diagnostics to the browser.
- [x] 3.6 Document MinIO startup, bucket privacy, separate MinIO/AWS credentials, required Rekognition IAM actions, AWS network/cost requirements, threshold configuration, and photo transmission to AWS; verify all settings match the actual configuration and no AWS secrets appear in frontend environment examples.

## 4. Registration API

- [x] 4.1 Implement `POST /api/registration/validate` without persistence; verify valid details return only validation confirmation, invalid details return field errors, and normalized duplicate emails return 409 without creating a user or photo.
- [x] 4.2 Implement `POST /api/registration/complete` with repeated DTO/uniqueness checks, one-face detection, private reference upload, password hashing, and account commit; verify valid enrollment returns only completion confirmation and the account/reference survive restart.
- [x] 4.3 Add compensation for failed account commits and sanitized operator cleanup records if object deletion fails; verify duplicate concurrent completions leave one account, never replace its photo, and failed inserts remove or record only their newly uploaded objects.
- [x] 4.4 Document both registration endpoint contracts and manual acceptance steps, including no-face enrollment, duplicate email, abandoned enrollment, storage/database failure, and orphan reconciliation; verify examples match observed HTTP status codes and response fields.

## 5. Credential-first login API

- [x] 5.1 Implement `POST /api/login/credentials` with no profile disclosure or persistent login state; verify correct credentials return only validation confirmation and invalid credentials trigger no storage or biometric calls.
- [x] 5.2 Implement `POST /api/login/verify-face` requiring and rechecking email/password before reference retrieval, then comparing the candidate with that account's reference; verify a direct call with invalid credentials cannot reach MinIO or Rekognition and a supplied user id or storage key is rejected.
- [x] 5.3 Return exactly id, email, firstName, lastName, and birthDate after both checks pass, with distinct safe mismatch/capture/service error codes; verify failure responses contain no profile fields and all responses contain no tokens, authentication cookies, password data, images, object keys, or similarity scores.
- [x] 5.4 Keep login images transient and the enrollment object unchanged; verify manually that successful and failed login attempts add no objects, image files, or image/database log entries.
- [x] 5.5 Document login contracts, token-free credential resubmission, profile-only behavior, and error codes; verify the request examples exercise valid login, mismatch, direct endpoint calls, unknown fields, missing reference, and dependency failures as specified.

## 6. Minimal feature-based React interface

- [x] 6.1 Add feature-owned registration/login/profile screens, shared typed API handling, and simple labeled form controls; verify feature imports follow the planned boundaries and both frontend typecheck and build pass without test tooling.
- [x] 6.2 Implement the shared webcam preview, JPEG capture, retake, and cleanup lifecycle without a file picker; verify permission denial, unavailable camera, retake, navigation away, and capture completion stop or restart camera tracks correctly and release preview URLs.
- [x] 6.3 Connect registration details validation and webcam completion, including field errors, duplicate-email handling, pending states, back/edit revalidation, and completion navigation; verify an invalid first step cannot open capture and successful registration clears sensitive state.
- [x] 6.4 Connect credential-first webcam login, transient credential resubmission, mismatch recapture, service retries, and final credential-error reset; verify the camera stays inactive before credential acceptance and no profile appears before face verification succeeds.
- [x] 6.5 Render only the returned profile after verification and clear passwords, captures, and profile state on flow restart or navigation; verify reload cannot restore login state and browser storage and URLs contain no flow secrets.
- [x] 6.6 Document browser camera permissions, localhost/HTTPS requirements, the no-upload input flow, and manual UI acceptance steps; verify those instructions against the actual UI using a camera-capable browser.

## 7. Integrated acceptance

- [x] 7.1 Run workspace build and typecheck commands; verify both applications compile successfully and the delivered source/manifests contain no automated tests or test frameworks.
- [x] 7.2 Complete the documented end-to-end manual checklist with local MinIO and real Rekognition: registration, restarted-app login, same-person match, different-person rejection, bad credentials, invalid/multiple-face captures, and direct final-endpoint bypass attempts; record outcomes and any checks blocked by missing camera, AWS access, or infrastructure without claiming unperformed checks passed.
- [x] 7.3 Verify the assembled application satisfies the three delta specs, including private storage, enrollment rollback behavior, transient login photos, profile-only output, no sessions/tokens, and reset after reload; record the observed result for each acceptance area.
