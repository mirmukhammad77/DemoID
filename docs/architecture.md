# Backend architecture

```text
Browser --> NestJS controller --> Application service
                                     |        |        |
                                     v        v        v
                               Repository   Storage  DeepFace HTTP client
                                     |        |        |
                                     v        v        v
                                   SQLite   MinIO    Python service
```

All NestJS modules live under `api/src/modules/`, including `app.module.ts`, configuration, database, and storage. Module files contain dependency wiring. Feature controllers, services, and repositories have separate files.

- Controllers define routes, accept DTOs and uploads, invoke the application service, and return the public HTTP response. Shared interceptors/pipes validate image transport and convert Multer uploads into plain image bytes/content types.
- Services implement workflows and application rules. Login checks credentials before accessing a reference or calling Python; registration coordinates availability, face validation, hashing, storage, insertion, and compensation. Services do not accept Express/Multer objects or construct HTTP responses.
- `users/users.repository.ts` performs database operations and reports persistence errors. `users/users.service.ts` interprets email conflicts and credentials. Database lifecycle and data-source configuration remain in `modules/database/`.
- `biometrics/clients/deepface.client.ts` handles bounded HTTP exchange and validates provider result shapes. `biometrics.service.ts` enforces face counts and matching rules. Python does not receive account credentials or access SQLite/MinIO.
- Application errors carry stable codes; `shared/filters/api-exception.filter.ts` translates them into public statuses/messages. Provider diagnostics are not returned.

Feature DTOs use `dtos/<name>.dto.ts`; entities use `entity/<name>.entity.ts`; utilities use `utils/<name>.util.ts`. Keep a helper within its feature when only that feature uses it. Cross-module DTO bases, filters, pipes, interceptors, types, and utilities live in corresponding folders under `api/src/shared/`. The user entity contains persistence metadata, while the login-local profile mapper selects the five public fields.

## Migrations and builds

Migration sources are in **`api/migrations/`**, beside `api/src/`. Preserve the initial migration's class/timestamp when moving files: relocation does not require a schema change or reset.

From the repository root:

```powershell
npm.cmd run build
npm.cmd run db:migrate
npm.cmd run db:migrate
```

The first run on a new database applies the initial migration; the second applies zero. An existing migrated database applies zero and retains its accounts. Startup also applies pending migrations with synchronization disabled.

The API TypeScript project includes `src/**/*.ts` and `migrations/**/*.ts`, with `rootDir: "."` and `outDir: "dist"`. Compiled entry points, relative to `api/`, are:

- API: `dist/src/main.js`
- Migration runner: `dist/src/modules/database/migrate.js`
- Initial migration: `dist/migrations/initial.migration.js`

The source data-source imports the migration explicitly through `../../../migrations/initial.migration`. The relative relationship is preserved in compiled output, avoiding simultaneous discovery of `.ts` and `.js` copies. Run API commands with working directory `api/` (the root npm workspace commands do this). `DATABASE_PATH=data/demoid.sqlite` remains relative to that working directory.

Use a disposable database to verify migration compatibility. Do not delete an existing database or MinIO volume when changing source paths. Keep existing registration photos; DeepFace processes the original image bytes without an embedding migration.
