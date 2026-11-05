# DemoID

A minimal two-step identity verification app: register profile details and a webcam reference photo, then sign in with email/password followed by a fresh face comparison.

See [backend architecture](docs/architecture.md) for module responsibilities, folder conventions, and `api/migrations/` build/runtime paths.

- `api/`: modular NestJS + TypeScript, class-validator, SQLite/TypeORM, private local MinIO, and an internal DeepFace HTTP client.
- `deepface-service/`: a separate Python 3.11 FastAPI service using pinned DeepFace and ONNX Runtime for CPU inference.
- `web/`: React + TypeScript + Vite, organized by feature.
- Login returns only `id`, `email`, `firstName`, `lastName`, and `birthDate`. There are no session tokens, authentication cookies, dashboard, or persistent login state.
- No automated tests or test framework dependencies are included. Validation uses builds, type checks, and the [manual checklist](docs/manual-verification.md).

## Local setup (PowerShell)

Install Node.js 22.12 or newer, npm, Python 3.11, and Docker Desktop with its Linux engine running. Use a Node version supported by the installed native dependencies. The first storage build needs network access to Docker Hub, GitHub, and the Go module proxy; Python setup needs PyPI and model preparation needs GitHub.

If this machine reports `mise-shim: failed to execute mise` when running Node, select the installed Node executable for the current PowerShell terminal before running the commands below: `$env:Path = 'C:\Program Files\nodejs;' + $env:Path` (adjust the installation path if needed).

Run these commands from the DemoID folder:

```powershell
npm.cmd install
Copy-Item .env.example .env
Copy-Item api/.env.example api/.env
Copy-Item web/.env.example web/.env
Copy-Item deepface-service/.env.example deepface-service/.env
py -3.11 -m venv deepface-service/.venv
deepface-service/.venv/Scripts/python.exe -m pip install -r deepface-service/requirements.txt
```

Edit the root `.env` and `api/.env` so the local MinIO username, secret, and bucket match. Example credentials are only placeholders for local development. AWS Rekognition credentials and an AWS S3 bucket are not needed. MinIO continues to use its separate local credentials.

```powershell
npm.cmd run storage:up
npm.cmd run build
npm.cmd run db:migrate
```

The Compose configuration builds pinned official MinIO server and client source releases locally because their historical Docker Hub image references are unavailable. The initial Go builds can take several minutes; subsequent starts use cached images. No Go installation on Windows is needed. Sources: [MinIO server releases](https://github.com/minio/minio/releases), [MinIO client releases](https://github.com/minio/mc/releases).

Prepare the model weights once, then start both backends with one root command:

```powershell
Push-Location deepface-service
.venv/Scripts/python.exe -m app.prepare_models
Pop-Location
npm.cmd run dev
```

The launcher starts NestJS and Python concurrently, labels their logs, and reports ready after the API is reachable and Python has initialized its model and detector. Ctrl+C stops both services and their child processes. An unexpected service exit stops its sibling and fails the command. The initial VGG-Face download is about 537 MB, so prepare weights before starting the pair. See the [Python service guide](deepface-service/README.md) for standalone commands and troubleshooting.

Start the frontend in another terminal:

```powershell
npm.cmd run dev:web
```

Open **http://localhost:5173** or **http://127.0.0.1:5173**. The API listens on **http://127.0.0.1:3000/api**. `WEB_ORIGIN` defines the allowed frontend origin; for localhost or 127.0.0.1, both local aliases are allowed on the same configured port. For a different port or a deployed frontend, update `WEB_ORIGIN` and restart the API. MinIO's local console is at **http://127.0.0.1:9001**, and its S3 endpoint is **http://127.0.0.1:9000**.

Allow camera permission when you reach the second step. Capture and review a still photo, retake if needed, then submit it. There is no file picker. Camera access works on localhost or HTTPS in a supported browser. A denied, missing, or busy camera produces an inline retry message.

## Configuration and data

Root `.env` configures Docker Compose; `api/.env` configures NestJS; `deepface-service/.env` configures Python; `web/.env` contains only the public NestJS API URL. See their `.env.example` files. The browser never calls Python directly.

NestJS uses `DEEPFACE_BASE_URL=http://127.0.0.1:8000` and `DEEPFACE_TIMEOUT_MS=30000`. Python defaults to VGG-Face, OpenCV detection, cosine distance, alignment, and the CPU ONNX engine. The pinned model's default distance threshold is **0.68**; a distance at or below the threshold is a match. Set optional `DEEPFACE_DISTANCE_THRESHOLD` in the Python environment only after checking representative captures. It must be finite and between 0 and 2. Remove the retired `FACE_SIMILARITY_THRESHOLD` setting; the old AWS value `95` has no direct conversion, and startup reports migration guidance if it is still present.

The combined launcher uses a separate `DEV_STARTUP_TIMEOUT_MS` deadline (default 180000). Set `PYTHON_EXECUTABLE` to an interpreter's full path to override the local virtualenv. Launcher overrides can be set in the root `.env` or terminal environment. Keep `DEEPFACE_BASE_URL` in the API configuration aligned with Python's `DEEPFACE_HOST`/`DEEPFACE_PORT`. Each service loads its own environment file; the launcher does not copy API secrets into Python's environment file.

Accounts are stored in `api/data/demoid.sqlite` by default. `DATABASE_PATH` is relative to the backend working directory. The initial migration runs on startup and can also be applied with `npm.cmd run db:migrate`; synchronization is disabled. Registration checks email uniqueness twice and the database has a unique constraint. Passwords use salted asynchronous scrypt hashes; names and email are normalized, passwords are not.

The enrollment reference is stored in the private `demoid-faces` MinIO bucket, backed by a Docker named volume. No public photo links are returned. NestJS sends only image bytes to the local Python service, encoded as bounded JSON base64. Python never accesses account data or MinIO and does not spool uploads to disk. Login photos remain transient in both services. Once dependencies and weights are installed, inference needs no AWS calls. Model weights in `deepface-service/.deepface/` are a cache, distinct from user images.

Registration validates a single detected face. Login compares the fresh capture against the reference associated with the checked credentials. This demo performs face similarity matching; liveness checks and identity-document verification are outside its scope.

Birth dates must be real dates before the current UTC date in `YYYY-MM-DD` format. Names contain 1–100 characters after trimming, email is valid and at most 254 characters after trimming/lowercasing, and passwords contain 8–128 characters without trimming. Images must be decodable JPEG/PNG, contain one detected face, and be no larger than 5,242,880 bytes. See [API contracts](docs/api.md).

To stop storage while preserving reference photos:

```powershell
npm.cmd run storage:down
```

Do not remove the MinIO volume or SQLite database unless you intend to discard local registrations. Uploaded objects and database rows cannot share a transaction. A failed account insert triggers deletion of that attempt's image. Failed deletion is recorded in `api/data/orphan-cleanup.jsonl` (or next to the configured database). After a process crash, compare the bucket's keys with the `users.faceObjectKey` column. Remove an orphan only after confirming that no committed account references it. Keep the database and bucket backups together.

## Commands

| Command | Purpose |
| --- | --- |
| `npm.cmd run dev` | Start and supervise NestJS plus Python DeepFace together |
| `npm.cmd run dev:api` | Watch backend TypeScript and restart on changes |
| `npm.cmd run dev:web` | Start the Vite development server |
| `npm.cmd run build` | Compile the backend and build the frontend |
| `npm.cmd run typecheck` | Type-check both applications |
| `npm.cmd run db:migrate` | Apply pending SQLite migrations |
| `npm.cmd run storage:up` | Build/start local storage and initialize a private bucket |
| `npm.cmd run storage:down` | Stop storage, preserving its volume |
| `npm.cmd run start --workspace api` | Run the compiled backend |

Current results are recorded in [docs/verification-deepface.md](docs/verification-deepface.md); [docs/verification.md](docs/verification.md) preserves historical AWS evidence.
