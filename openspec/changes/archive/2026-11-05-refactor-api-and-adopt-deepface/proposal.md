# Proposal

## Why

The backend currently combines module wiring, controllers, services, and database access in a few files, making responsibilities difficult to maintain independently. Replacing AWS Rekognition with a local Python DeepFace service provides an opportunity to establish clear boundaries and run biometric verification without AWS Rekognition credentials or calls.

## What Changes

- Move all NestJS modules under `api/src/modules/`, including the application, configuration, database, and storage modules. Separate module wiring, controllers, services, database repositories, DTOs, entities, and provider clients into appropriate files.
- Keep HTTP routing and request/file validation in controllers and their pipes/interceptors; keep workflows and application rules in services; restrict repositories to database access. Services receive plain inputs and image bytes rather than Express request, response, or uploaded-file objects.
- Use module-local `dtos/<name>.dto.ts`, `entity/<name>.entity.ts`, and `utils/<name>.util.ts`. Put genuinely cross-module helpers and transport infrastructure under appropriately named folders in `api/src/shared/`.
- Move migration sources to `api/migrations/`, update compilation and migration entry points within the API project, and preserve existing migration identity, database contents, and private MinIO references.
- Replace both AWS Rekognition DetectFaces and CompareFaces with a separate Python DeepFace HTTP service. The frontend continues to call NestJS; NestJS coordinates inference, account persistence, reference storage, and application responses.
- Explicitly enforce exactly one face for enrollment and verification; use a pinned DeepFace model/detector/distance configuration instead of AWS's 0-100 similarity scale.
- Add one root development command to start and supervise NestJS and Python together, including readiness, useful startup errors, combined logs, and shutdown of both services.
- **BREAKING (operator configuration and internal paths):** Remove Rekognition credentials/region requirements and `FACE_SIMILARITY_THRESHOLD`; introduce DeepFace connection and distance-based configuration, Python dependencies/model provisioning, and updated compiled entry points. Public browser API routes, response shapes, and error codes remain compatible.

## Capabilities

### New Capabilities

- `development-runtime`: Start the NestJS and Python biometric backends with one command, report readiness and failures, and stop both processes together.

### Modified Capabilities

- `biometric-login`: Replace AWS comparison and similarity thresholds with DeepFace over internal HTTP, explicitly validate face counts, and fail closed on Python transport, readiness, or result errors.
- `user-registration`: Require enrollment face detection through DeepFace while preserving image limits, exactly-one-face validation, and account/reference consistency.

## Impact

- Backend files throughout `api/src/`, TypeScript build configuration, migration discovery/runner scripts, package manifests and lockfile, environment examples, and root development scripts.
- New `deepface-service/` Python application, dependency pins, HTTP contracts, model readiness, and documented setup; `api/migrations/` owns migration sources alongside `api/src/`.
- Remove `@aws-sdk/client-rekognition`. Retain the S3-compatible client and its dependencies for private local MinIO storage.
- Update README, API documentation, manual acceptance checks, and verification records to describe DeepFace and distinguish historical AWS evidence from new verification.
- No database schema change, re-enrollment requirement, persistent session, UI redesign, or new liveness feature is planned. Stored original enrollment images can be processed by DeepFace; representative existing enrollments must be checked with the selected detector/model.
