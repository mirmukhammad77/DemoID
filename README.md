# DemoID

A minimal two-step identity verification app: register profile details and a webcam reference photo, then sign in with email/password followed by a fresh face comparison.

- `api/`: modular NestJS + TypeScript, class-validator, SQLite/TypeORM, private local MinIO, AWS Rekognition.
- `web/`: React + TypeScript + Vite, organized by feature.
- Login returns only `id`, `email`, `firstName`, `lastName`, and `birthDate`. There are no session tokens, authentication cookies, dashboard, or persistent login state.
- No automated tests or test framework dependencies are included. Validation uses builds, type checks, and the [manual checklist](docs/manual-verification.md).

## Local setup (PowerShell)

Install Node.js 22.12 or newer, npm, and Docker Desktop with its Linux engine running. Use a Node version supported by the installed native dependencies. The first storage build also needs network access to Docker Hub, GitHub, and the Go module proxy.

If this machine reports `mise-shim: failed to execute mise` when running Node, select the installed Node executable for the current PowerShell terminal before running the commands below: `$env:Path = 'C:\Program Files\nodejs;' + $env:Path` (adjust the installation path if needed).

Run these commands from the DemoID folder:

```powershell
npm.cmd install
Copy-Item .env.example .env
Copy-Item api/.env.example api/.env
Copy-Item web/.env.example web/.env
```

Edit the root `.env` and `api/.env` so the local MinIO username, secret, and bucket match. Example credentials are only placeholders for local development. AWS credentials belong only to the backend process; MinIO credentials are separate and do not grant access to AWS.

```powershell
npm.cmd run storage:up
npm.cmd run build
npm.cmd run db:migrate
```

The Compose configuration builds pinned official MinIO server and client source releases locally because their historical Docker Hub image references are unavailable. The initial Go builds can take several minutes; subsequent starts use cached images. No Go installation on Windows is needed. Sources: [MinIO server releases](https://github.com/minio/minio/releases), [MinIO client releases](https://github.com/minio/mc/releases).

Configure an AWS profile with permission to call `rekognition:DetectFaces` and `rekognition:CompareFaces` in your selected region. Set `AWS_REGION` in `api/.env`, then start the backend in one terminal:

```powershell
$env:AWS_PROFILE = 'your-local-profile'
npm.cmd run dev:api
```

Alternatively, provide `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and, for temporary credentials, `AWS_SESSION_TOKEN` through the backend environment. This optional AWS provider credential is unrelated to app login: the application never issues a user session token. Never put AWS secrets in a `VITE_` variable or commit `.env` files.

Start the frontend in another terminal:

```powershell
npm.cmd run dev:web
```

Open **http://localhost:5173** or **http://127.0.0.1:5173**. The API listens on **http://127.0.0.1:3000/api**. `WEB_ORIGIN` defines the allowed frontend origin; for localhost or 127.0.0.1, both local aliases are allowed on the same configured port. For a different port or a deployed frontend, update `WEB_ORIGIN` and restart the API. MinIO's local console is at **http://127.0.0.1:9001**, and its S3 endpoint is **http://127.0.0.1:9000**.

Allow camera permission when you reach the second step. Capture and review a still photo, retake if needed, then submit it. There is no file picker. Camera access works on localhost or HTTPS in a supported browser. A denied, missing, or busy camera produces an inline retry message.

## Configuration and data

Root `.env` configures Docker Compose; `api/.env` configures the backend; `web/.env` contains only its public API URL. See their `.env.example` files for all settings. `FACE_SIMILARITY_THRESHOLD` defaults to **95** and must be an integer from 0 to 100. Compare representative captures before choosing a different threshold.

Accounts are stored in `api/data/demoid.sqlite` by default. `DATABASE_PATH` is relative to the backend working directory. The initial migration runs on startup and can also be applied with `npm.cmd run db:migrate`; synchronization is disabled. Registration checks email uniqueness twice and the database has a unique constraint. Passwords use salted asynchronous scrypt hashes; names and email are normalized, passwords are not.

The enrollment reference is stored in the private `demoid-faces` MinIO bucket, backed by a Docker named volume. No public photo links are returned. Login photos stay in memory and never enter the bucket or database. The backend sends image bytes to real AWS Rekognition for detection/comparison, so face steps require AWS connectivity, valid credentials, and billable AWS calls even though photo storage is local. No AWS S3 bucket is required. See [AWS image inputs](https://docs.aws.amazon.com/rekognition/latest/APIReference/API_Image.html).

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
| `npm.cmd run dev:api` | Watch backend TypeScript and restart on changes |
| `npm.cmd run dev:web` | Start the Vite development server |
| `npm.cmd run build` | Compile the backend and build the frontend |
| `npm.cmd run typecheck` | Type-check both applications |
| `npm.cmd run db:migrate` | Apply pending SQLite migrations |
| `npm.cmd run storage:up` | Build/start local storage and initialize a private bucket |
| `npm.cmd run storage:down` | Stop storage, preserving its volume |
| `npm.cmd run start --workspace api` | Run the compiled backend |

Verification results and remaining prerequisites are recorded in [docs/verification.md](docs/verification.md).
