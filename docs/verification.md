# Verification record

Implementation session: 2026-11-01. No automated tests, test files, or test framework dependencies were added. Checks below were performed using build commands, disposable local fixtures, HTTP requests, and headless-browser inspection. Temporary fixture data is excluded by `.gitignore`.

## Passed

- `npm.cmd install`, `npm.cmd run build`, and `npm.cmd run typecheck` completed for both root-level workspaces.
- `npm.cmd run db:migrate` applied the initial SQLite migration on a fresh database; a second invocation applied zero. A disposable hashed account survived closing and reopening its database.
- API startup without required configuration failed safely. Valid configuration started the application.
- The development TypeScript loader started successfully. Latest compiled HTTP checks confirmed malformed JSON returns safe 400 with `Cache-Control: no-store`, and successful credential validation returns no-store with the configured frontend CORS origin.
- Salted scrypt verification accepted the correct password and rejected a different or whitespace-modified password; no plaintext password appeared in its stored encoding.
- HTTP registration validation accepted valid details and rejected impossible/future dates, blank names, short passwords, and extra fields. Duplicate normalized email returned 409. Invalid credentials and unknown accounts returned the same generic 401. Credential success returned only validation confirmation, without an authentication cookie.
- Calling face verification directly with wrong credentials returned 401. Supplying another object key returned a DTO error. Neither returned a profile.
- Empty, unsupported, MIME-mismatched, truncated, oversized, and extra-file enrollment requests were rejected. Oversize input returned 413; other invalid image requests returned 400. No account was committed by these checks.
- Local MinIO and its client were built from pinned official source tags. Compose started successfully twice, including idempotent private-bucket initialization. An image round-tripped with identical bytes, remained after the second startup, and denied anonymous retrieval with 403. The disposable object was deleted afterward.
- A missing reference returned sanitized 503 without a profile or authentication cookie. An isolated storage adapter pointed at an unavailable local endpoint also returned 503.
- Controlled provider errors for access denial, throttling, timeout, internal failure, and missing credentials all mapped to sanitized 503 for both biometric operations, without leaking diagnostics. These were error-mapping checks with an isolated provider instance, not live AWS IAM or network checks.
- Isolated enrollment checks used the real SQLite and MinIO implementations with a controlled biometric-provider result. Two concurrent attempts for one email produced one account, one reference, and one 409. A forced database insert failure removed its uploaded image. A forced cleanup failure wrote a safe operator journal, after which the disposable object was removed manually.
- Isolated successful and mismatching login branches returned the five-field profile or a 401 respectively and left object storage unchanged. The biometric result was controlled for these checks; this is not evidence of a real-person match. All disposable rows and reference objects created by these isolated checks were removed.
- Browser inspection covered desktop and 390px mobile layouts without horizontal overflow or observed JavaScript exceptions. Wrong credentials did not activate the camera; correct credentials did. Denied camera permission showed an actionable error and disabled capture. No file picker was present.
- Synthetic camera streams exercised capture, preview, retake, back navigation, and component cleanup. Every started stream was stopped when leaving its capture flow. This did not use a real person's camera image.
- UI-only controlled completion responses exercised registration confirmation, mismatch recapture, a credential rejection resetting login, and the five-field profile display. Switching flows cleared passwords; refresh cleared the profile. Local and session storage stayed empty. Browser response overrides were discarded on reload and were never added to the application.
- The source and manifests contain no automated tests, test scripts, or test framework dependencies. Git ignore checks covered `.env`, SQLite data, temporary verification artifacts, dependency cache, and build output.

## CORS follow-up

- Reproduced the first-step origin mismatch: the original API returned `Access-Control-Allow-Origin: http://localhost:5173` to a request from `http://127.0.0.1:5173`.
- Allowed the configured frontend origin and its localhost/127.0.0.1 alias on the same port. Different ports and unrelated origins receive no allow-origin header; a configured deployed origin does not acquire local aliases.
- Moved CORS middleware before JSON parsing. Verified matching preflight headers, successful registration validation, and readable malformed-JSON errors for both local addresses.
- Backend build and typecheck passed. No automated tests or test dependencies were added.

## Final user verification

The user confirmed successful registration and credential-first face-verified login, then confirmed the remaining manual cases when asked: wrong-face, no-face, and multiple-face rejection, plus login with an existing account after restarting the application. The user also confirmed that the CORS issue is resolved. These live outcomes are user-reported; the agent-run provider checks described above used controlled results.

Together with the recorded database, storage, rollback, HTTP, browser-state, and failure-handling checks, this completes acceptance of the three capability specs. Tasks 3.4, 4.2, 7.2, and 7.3 are complete based on the user's manual confirmation and the previously recorded checks.

## TypeScript configuration follow-up

- Replaced the backend's deprecated `moduleResolution: node` setting with matching `module: NodeNext` and `moduleResolution: NodeNext` settings. The API package explicitly declares `type: commonjs` so its runtime module format is retained.
- Listed the Node, Express, and Multer ambient types explicitly. No deprecation-suppression setting was added. The approach follows the [official TypeScript migration guidance](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/).
- Workspace builds and type checks passed with the installed TypeScript 5.9.3 compiler. The latest backend configuration also passed its build/typecheck after the explicit types were added. Both compiled startup and the ts-node development loader returned 200 for the first registration step. A separate TypeScript 6 compiler was not run.

All 31 implementation and verification tasks are complete. The OpenSpec change is ready for archiving when requested.

See [manual-verification.md](manual-verification.md) for repeatable checks and [README.md](../README.md) for local configuration.

The temporary verification browser and API/web processes were stopped after inspection. Local MinIO remains running; no verification credentials or synthetic provider behavior were added to the application configuration.
