# Design

## Context

See `proposal.md` for motivation and scope. The current NestJS backend embeds registration controller/service classes in `registration.module.ts`, implements the login workflow in its controller, and lets `UsersService` query TypeORM directly. Shared DTOs, HTTP errors, and image validation are mixed in `common/`. Services currently receive `Express.Multer.File` and throw HTTP exceptions.

SQLite stores profile fields, salted scrypt hashes, and private MinIO object keys. Original enrollment images are available for a new comparison engine, so no embedding migration is needed. The initial migration is `InitialUsers1793520000000`; TypeORM synchronization is disabled and migrations run at startup. The backend TypeScript configuration currently compiles only `api/src` into `api/dist`.

The root package has separate API and web development commands but no Python project or combined launcher. Existing acceptance evidence combines controlled provider checks and user-reported real webcam outcomes; it does not establish DeepFace correctness.

## Goals / Non-Goals

**Goals:**

- Make transport, workflows, persistence, and provider integration independently understandable while retaining the existing public API and credential-first sequencing.
- Keep every NestJS module under `api/src/modules/`, share helpers by actual usage, and make `api/migrations/` sources work in both source and compiled execution.
- Provide a bounded, stateless HTTP contract between NestJS and a continuously running Python inference process, with explicit face counts and strict result validation.
- Make local startup and shutdown of both backends predictable on Windows PowerShell.

**Non-Goals:**

- Introduce a new account schema, embedding database, persistent session, liveness checks, or browser-to-Python API.
- Add production orchestration, GPU requirements, automatic threshold training, or a general plugin framework for multiple biometric providers.
- Automatically install Python packages, download dependencies through the development launcher, or reset account/storage data.

## Decisions

### 1. Feature modules own their layers; shared code has no feature ownership

Use this structure, creating only folders that have contents:

```text
DemoID-deepface/
  scripts/
    dev.mjs
  api/
    migrations/
      initial.migration.ts
    src/
      main.ts
      modules/
        app.module.ts
        registration/
          registration.module.ts
          registration.controller.ts
          registration.service.ts
          dtos/registration.dto.ts
          validators/past-date.validator.ts
          utils/enrollment-cleanup.util.ts
        login/
          login.module.ts
          login.controller.ts
          login.service.ts
          dtos/login.dto.ts
          utils/profile.util.ts
        users/
          users.module.ts
          users.service.ts
          users.repository.ts
          password.service.ts
          entity/user.entity.ts
        biometrics/
          biometrics.module.ts
          biometrics.service.ts
          clients/deepface.client.ts
          types/deepface-result.type.ts
        config/
          config.module.ts
          config.service.ts
        database/
          database.module.ts
          database.service.ts
          data-source.ts
          migrate.ts
        storage/
          storage.module.ts
          storage.service.ts
      shared/
        dtos/credentials.dto.ts
        errors/application.error.ts
        filters/api-exception.filter.ts
        interceptors/photo-upload.interceptor.ts
        pipes/photo-validation.pipe.ts
        pipes/validation.pipe.ts
        types/validated-photo.type.ts
        utils/validation.util.ts
  deepface-service/
    app/
      main.py
      settings.py
      controllers/
      dtos/
      services/
      clients/
    requirements.txt
    .env.example
```

Module files declare imports/providers/controllers/exports only. The root bootstrap stays in `main.ts` and imports `modules/app.module.ts`. Configuration, storage, and database lifecycle providers are also extracted from their module definitions. DTOs use class-validator/class-transformer with existing normalization, date rules, length limits, and unknown-field rejection. Registration and login own their DTO entry points; a shared credentials base avoids importing a login DTO into registration.

Controllers depend on their application service, not on repositories, storage, or the DeepFace client. Upload interceptors and validation pipes enforce MIME/signature agreement, full JPEG/PNG decoding, the 20-million-pixel bound, one-file limits, and the existing 5,242,880-byte maximum. They convert Multer files into a plain validated-photo value containing bytes and content type. Workflows receive that value and validated plain field inputs, without HTTP request, response, or Multer objects.

`LoginService` performs credential validation, reference retrieval, biometric validation/comparison, and profile selection in that order. Byte-format validation can happen at the transport boundary, but invalid credentials must still prevent MinIO retrieval and Python calls. `RegistrationService` owns email availability checks, hashing, enrollment validation, storage/persistence coordination, and compensation after failure. The cleanup journal remains registration-local. The profile mapper remains login-local; the entity file contains persistence metadata only.

`UsersRepository` performs lookups/inserts and translates driver failures into transport-independent persistence errors, including email uniqueness violations. `UsersService` owns credential and availability rules and uses `PasswordService`. The TypeORM data source remains infrastructure; application services and controllers do not query it directly. MinIO is accessed through a storage service and Python through a client, not through database repositories.

Use application errors without HTTP status dependencies inside services, repositories, and clients. The shared exception filter maps application error codes to the existing HTTP statuses/messages, sanitizes dependency errors, and preserves DTO field errors. This moves transport translation out of the application layers rather than only moving classes between files.

Alternative: keep the current mixed files and rename directories. Rejected because it leaves database access in services, orchestration in controllers, and transport objects crossing application boundaries.

### 2. Run one private Python inference service and call it over HTTP

Use FastAPI and Uvicorn in `deepface-service/`, defaulting to `127.0.0.1:8000`. Its controllers parse internal requests, its inference service coordinates detection/comparison, and a local client/adapter wraps DeepFace calls. It has no database or MinIO client. NestJS uses Node's HTTP/fetch facilities behind `DeepFaceClient`; only `BiometricsService` interprets the resulting measurements as application rules.

Choose Python 3.11 as the initial supported local runtime and commit exact compatible dependency pins for DeepFace, the CPU inference engine, FastAPI/Uvicorn, and image decoding. Installation must be verified on the supported Windows environment before recording the pins as working. Use one Python worker and a bounded single-inference slot initially; return an internal unavailable response when saturated rather than accepting an unbounded inference queue. Readiness handling remains responsive while inference runs outside the ASGI event loop.

Initialize the recognition model and detector once in the service lifespan. Model weights may be cached on disk; user images and generated embeddings are request-local and are not persisted. Provide an explicit model preparation command using the same initialization path so dependencies and weights can be provisioned before development startup. Readiness succeeds only after initialization; model download/load failure prevents a ready state. [FastAPI lifespan documentation](https://fastapi.tiangolo.com/advanced/events/) describes initialization before request handling.

Alternative: spawn Python per request. Rejected because repeatedly starting the interpreter and loading weights would add latency and complicate concurrency and process cleanup. Direct browser-to-Python requests would bypass the public API's credential and application rules and are excluded by the confirmed architecture.

### 3. Use an explicit, memory-only internal request and result contract

The browser multipart contract stays unchanged. NestJS converts validated image bytes to base64 in bounded JSON requests to Python. This avoids file-upload implementations that may spool larger inputs to temporary disk. Python limits the actual streamed request body before JSON parsing to 14 MiB, then strictly decodes base64 and enforces each decoded image's 5,242,880-byte limit, allowed format, frame count, and 20-million-pixel bound before full image decoding. Paths and remote URLs are not accepted.

| Internal endpoint   | Input                                  | Successful result                                                   |
| ------------------- | -------------------------------------- | ------------------------------------------------------------------- |
| `GET /health/ready` | None                                   | `{ status: "ready", model, detector, metric }` after initialization |
| `POST /detect`      | `{ imageBase64 }`                      | `{ faceCount }`, a nonnegative integer                              |
| `POST /compare`     | `{ referenceBase64, candidateBase64 }` | A discriminated face-count or comparison result described below     |

`/compare` returns `status: "invalid_faces"` and both face counts when either count is not one; comparison measurements are absent in that branch. Otherwise it returns `status: "compared"`, both counts equal to one, finite nonnegative `distance` and `threshold`, boolean `verified`, and the effective `model`, `detector`, and `metric`. NestJS rejects unknown result variants, invalid counts/numbers, missing fields, or `verified` inconsistent with `distance <= threshold`. Runtime validation is required; TypeScript assertions alone are insufficient. Cap the internal response body at 64 KiB and apply a configurable inference deadline, initially 30 seconds, through body consumption as well as connection establishment. Do not automatically retry inference.

The Python adapter counts all detected faces before comparing, using enforced detection and translating only the supported library's explicit no-face outcome into count zero. It must not select the largest face, truncate detections to one, disable detection, or interpret arbitrary exceptions as no-face/mismatch. With one face in each image it calls verification using the same configured detector/model/metric. [DeepFace detection](https://github.com/serengil/deepface/blob/master/deepface/modules/detection.py) returns detections and handles no-face separately; detection enforcement is not a substitute for counting them.

NestJS services map valid observations as follows:

| Observation                                                     | Public outcome                |
| --------------------------------------------------------------- | ----------------------------- |
| Enrollment face count differs from one                          | 422 `INVALID_FACE`            |
| Login candidate count differs from one, with a valid reference  | 422 `INVALID_FACE`            |
| Stored reference has zero/multiple faces or cannot be processed | 503 `SERVICE_UNAVAILABLE`     |
| Single-face distance exceeds threshold                          | 401 `FACE_MISMATCH`           |
| Valid single-face distance is within threshold                  | Existing profile-only success |
| Transport, timeout, readiness, inference, or protocol failure   | 503 `SERVICE_UNAVAILABLE`     |

If both login images have invalid counts, the unusable stored reference takes precedence as a dependency failure. Images, profiles, credentials, URLs, and raw provider errors are absent from logs and internal error responses. HTTP requests to Python contain images only, not account/profile or storage credentials. Internal HTTP errors remain sanitized even when the service is called directly.

Alternative: use the library's generic public REST server unchanged. A small application-owned contract makes face counts, error classification, memory-only handling, and readiness explicit instead of coupling NestJS to broad provider endpoints.

### 4. Make comparison settings explicit and independent of AWS similarity

Proposed implementation defaults are `VGG-Face`, `opencv`, and `cosine`, with alignment enabled, detection enforced, and anti-spoofing disabled. They provide a documented baseline without introducing extra detector/model choices. The Python service reads `DEEPFACE_MODEL`, `DEEPFACE_DETECTOR_BACKEND`, `DEEPFACE_DISTANCE_METRIC`, and optional `DEEPFACE_DISTANCE_THRESHOLD`; the browser cannot choose these settings. Unsupported combinations, detector `skip`, and invalid threshold values fail startup. The initial supported configuration is the stated model/detector/metric combination; changing support requires its own acceptance evidence.

When no override is set, use the pinned library version's default distance threshold for that model/metric and return the effective threshold internally. An override must be finite and within the selected metric's valid range. NestJS enforces the distance rule and validates consistency with Python's boolean; neither service converts the old value `95` into a distance. Retired `FACE_SIMILARITY_THRESHOLD` configuration must trigger actionable migration guidance rather than being silently applied or ignored. [DeepFace verification](https://github.com/serengil/deepface/blob/master/deepface/modules/verification.py) documents model/metric-specific thresholds and distance-based comparison.

NestJS configuration adds `DEEPFACE_BASE_URL` (default `http://127.0.0.1:8000`) and `DEEPFACE_TIMEOUT_MS` (default `30000`). Python owns its own environment example and CPU engine setting, explicitly recorded with the pinned runtime. Remove `AWS_REGION` and Rekognition credential instructions from required application configuration, and remove `@aws-sdk/client-rekognition`. Retain S3 SDK/HTTP-handler dependencies and MinIO settings. Existing AWS environment variables may remain in a developer shell but are unnecessary for inference.

Alternative: reproduce an AWS-style percentage or silently retain the 95 threshold. Rejected because distance, model choice, and thresholds are not interchangeable with Rekognition similarity. Real same-person/different-person captures must validate the new baseline; no equivalent accuracy is assumed.

### 5. Compile API-local TypeScript migrations with the backend

Move `api/src/database/initial.migration.ts` to `api/migrations/initial.migration.ts`, preserving its class name, timestamp, SQL, and recorded identity. Migration sources belong to the API project, alongside `api/src/`. Move database infrastructure under `api/src/modules/database/` and the entity under `modules/users/entity/user.entity.ts`. Keep an explicit migration class registration so the source and compiled runtimes cannot load both copies through a mixed extension glob. From `api/src/modules/database/data-source.ts`, the initial migration import is `../../../migrations/initial.migration`; the same relative import resolves to the compiled migration after the build.

Set the API TypeScript compilation root to the API directory (`rootDir: "."` relative to `api/tsconfig.json`), with explicit includes for `src/**/*.ts` and `migrations/**/*.ts`, and retain `outDir: "dist"`. This emits `api/dist/src/main.js` and `api/dist/migrations/initial.migration.js`. Update the compiled API start path to `dist/src/main.js` and the migration runner to `dist/src/modules/database/migrate.js`; adjust static imports accordingly. Source development continues to run `src/main.ts` through ts-node. [TypeScript rootDir documentation](https://www.typescriptlang.org/tsconfig/rootDir.html) explains preserved relative output structure and the requirement to include emitted inputs under the compilation root.

Keep the API child working directory as `api/` so `DATABASE_PATH=data/demoid.sqlite`, API environment loading, and cleanup-journal placement do not change. Exclude frontend/Python sources from API compilation, and remove obsolete generated paths during a verified build cleanup inside `api/dist`.

Alternative: compile migrations as a separate project or convert them to JavaScript. Compiling `api/src/` and `api/migrations/` under the API directory avoids another build graph and preserves TypeScript migration sources without expanding compilation to the repository root; the deliberate trade-off is updating compiled entry points. No schema migration or account rewrite is needed for a source-file move.

### 6. Supervise both backends with a root Node development launcher

Add root `npm.cmd run dev`, invoking `scripts/dev.mjs`. It starts both processes with explicit working directories and argument arrays: the API with the installed Node executable and the existing watch/ts-node options, and Python from `deepface-service/.venv/Scripts/python.exe` on Windows or `.venv/bin/python` elsewhere. Support an explicit `PYTHON_EXECUTABLE` override. Use hidden child windows on Windows. Do not require shell activation or interpolate shell command strings.

Load each service's own environment file with environment-variable precedence; do not merge the API environment file into Python's environment. Label logs by service without logging configuration values or request bodies. Keep `dev:api` and `dev:web` available; document a Python-only command for troubleshooting. The combined command covers the two backends. Frontend Vite and the existing MinIO Compose lifecycle retain their documented commands.

Poll Python readiness and API reachability while both start; do not add a public profile/session endpoint for this purpose. Use `DEV_STARTUP_TIMEOUT_MS`, default 180000 ms, separately from inference timeouts. Provision model weights beforehand when initial downloads exceed that deadline. Report startup pending until both checks pass.

On spawn failure, readiness timeout, or unexpected child exit, stop the sibling service, identify the failed process, and exit nonzero. On Ctrl+C/SIGTERM, allow a bounded graceful stop and then terminate owned process trees. Account for Node watch descendants on Windows; if using `taskkill`, target only PIDs spawned and tracked by this launcher. Never stop processes solely because they occupy a port. A failed development session must release its own ports and leave no Python/watch process behind.

Alternative: two npm commands in a shell background expression or a bare parallel-process package. A small launcher can implement the required readiness and Windows process-tree behavior as one explicit lifecycle rather than relying on platform-specific shell semantics.

## Risks / Trade-offs

- Model weights and CPU initialization can be large or slow -> provide explicit provisioning, dependency pins, startup deadlines, and a ready signal; measure warmed inference latency separately from startup.
- A new detector/model may reject an existing enrollment or change match outcomes -> preserve original photos and hashes, validate representative existing accounts, and report unusable references as unavailable rather than weakening the one-face rule.
- Base64 increases internal transfer size and memory usage -> retain the 5 MiB per-image bound, cap streamed internal JSON and responses, keep one active inference slot, and avoid disk uploads or unbounded queues.
- A timed-out HTTP request does not necessarily interrupt native inference -> bound admission, avoid automatic retries, release request references when work finishes, and permit controlled worker restart if inference becomes unhealthy.
- Windows interruption may leave watch or Python descendants -> explicitly verify both normal interruption and failure cleanup, tracked process-tree termination, and immediate port reuse.
- Expanding the TypeScript compilation root from `api/src/` to `api/` changes emitted entry paths -> update all run scripts together and verify fresh build, compiled startup, source startup, and migration execution.
- Existing acceptance records describe the AWS implementation -> preserve historical evidence, add dated DeepFace results, and distinguish controlled contract checks from real-model/webcam acceptance.
- Loopback HTTP is a local development boundary -> production network exposure/authentication is outside this change and must be designed before deploying the worker beyond that boundary.

## Migration Plan

1. Refactor layers and paths while preserving public request/response behavior. Relocate migrations to `api/migrations/` with their original identity and update compilation/entry points.
2. Verify a disposable fresh database applies the initial migration once, then zero times on repetition. Verify a disposable previously migrated database retains its rows and applies zero migrations after relocation.
3. Create the pinned Python environment, provision weights, and verify standalone readiness, detection, comparison, and sanitized error responses.
4. Replace Rekognition integration and environment examples, connect NestJS to Python, and confirm enrollment/login operate without AWS Rekognition credentials. Keep private MinIO credentials and data intact.
5. Add the combined development launcher and verify startup, unready/dead worker behavior, port conflicts, unexpected exits, Ctrl+C, and port reuse on Windows.
6. Run workspace build/typecheck and documented acceptance checks using disposable fixtures plus real-model same-person, different-person, zero-face, multiple-face, and existing-enrollment cases. Record unavailable prerequisites honestly; controlled responses do not establish model accuracy.
7. Rollback, if necessary, restores the prior code, dependency lockfile, and AWS configuration and rebuilds the previous compiled layout. No database downgrade, destructive migration, or MinIO data reset is required because schema and reference format are unchanged. Stop both new backend processes before restarting the old API.
