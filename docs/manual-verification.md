# Manual acceptance checklist

No automated test framework is supplied. Run `npm.cmd run build` and `npm.cmd run typecheck`, then use disposable local accounts and the steps below. Live face outcomes require a real webcam, local MinIO, and the initialized Python DeepFace service. Record unavailable prerequisites as blocked rather than assuming success. Historical AWS results do not establish current DeepFace accuracy.

## Account and storage setup

- Start storage twice; confirm the bucket initializer succeeds both times and an existing object survives. Confirm anonymous object GET returns AccessDenied.
- Confirm migration sources live in `api/migrations/`. Run `npm.cmd run db:migrate` twice: the first fresh run applies one migration, the next applies zero. Against a disposable pre-refactor migrated database, confirm zero migrations and preserved accounts/hashes/reference keys. Confirm source and compiled startup work with the paths in [architecture.md](architecture.md).
- Start the API without required settings and confirm startup fails with a safe message. Start Python with a non-finite/out-of-range cosine distance threshold, unsupported model/detector/metric/engine, or retired `FACE_SIMILARITY_THRESHOLD`, and confirm it fails with setup guidance.
- Verify `.env` files, database files, reference photos, and generated builds are excluded from Git. Check frontend settings contain no provider credentials.

## Registration

- Enter valid profile details: only the webcam step opens and no account/photo exists yet. Leave the flow and confirm no account was created.
- Check malformed email, missing fields, blank names, too-long names, short/long passwords, extra fields, impossible dates, today, and future dates. Confirm errors appear on step one without echoing submitted passwords.
- Allow the camera, capture, preview, retake, and submit one clear face. Confirm one private reference and one account are stored and only completion confirmation is returned.
- Try the registered email with different case and spaces. Confirm 409 without changing its profile or image. Finish two requests for the same new email concurrently: one succeeds and one conflicts; no surviving reference is deleted.
- Submit empty, oversized, corrupt, unsupported, MIME-mismatched, no-face, and multiple-face images through the API as operator fixtures. Confirm rejection and no completed account.
- Stop MinIO or Python and submit a fresh valid enrollment. Confirm no reported success or login-visible partial account. Restore dependencies. Confirm successful enrollment needs no AWS Rekognition credentials.
- Force an insert failure after upload and inspect cleanup; if deletion is unavailable, confirm a safe orphan record is created. Compare account references to bucket keys after any interrupted attempt.

## Login

- Enter a wrong password or unknown email: both return the same 401 and do not activate the camera. Correct credentials return only `{ valid: true }` and open the webcam step.
- Call the final face endpoint directly with invalid/missing credentials and a photo. It must reject before a reference retrieval or biometric call. Extra user identifiers/object keys must be rejected.
- Use the enrolled person's fresh capture. Confirm login returns exactly id, email, firstName, lastName, and birthDate, without tokens, cookies, image locations, hashes, scores, or provider metadata.
- Use a different person's face with the account's valid credentials: confirm mismatch, no profile, and a recapture option. Check no-face and multiple-face captures are rejected.
- Rename/remove only a disposable account's reference, stop storage/Python, or simulate a Python timeout/malformed response. Confirm 503 without a profile; restore the dependency afterward. A stored reference with no/multiple detected faces must also return 503.
- Compare MinIO objects, database contents, temporary upload locations, and both services' logs before/after successful and failed login attempts: login images must not persist and references must remain unchanged. Python requests contain images only, with no account/profile/storage credentials.
- Reload after success: profile and credentials disappear, and sign-in starts from step one. Inspect URLs and browser storage for absence of passwords, captures, and profile data.

## Webcam interface

- Verify desktop and narrow mobile layouts, form labels, keyboard navigation, loading state, and duplicate-submit prevention.
- Deny camera access, disconnect the camera, or occupy it elsewhere: confirm an actionable message, retry control, and no file picker.
- Check capture, retake, leaving a step, switching registration/login, and submission completion stop the active camera tracks and release image preview URLs.
- Navigate away while an HTTP request or camera request is pending. Confirm no stale completion changes the new flow and late media streams are stopped.
- Change details after returning from capture: backend validation must run again. A credential rejection on final submission returns to login step one without its previous capture.

## Combined development command and Python worker

- Install the pinned Python 3.11 requirements and run the model preparation command from the [service guide](../deepface-service/README.md). Check model/detector initialization and effective threshold; user images must never enter the model cache.
- Run `npm.cmd run dev` from PowerShell. Confirm API and Python logs are labeled and both processes start without another backend terminal. Confirm ready is announced only after initialized Python readiness and API reachability. Start Vite separately and confirm browser network calls target only NestJS.
- Check missing Python/dependencies, invalid settings, occupied API/Python ports, and a startup deadline with an unready model. Confirm actionable failure, nonzero exit, and cleanup only of launcher-owned processes; unrelated port owners remain running.
- Press Ctrl+C after normal startup, then restart immediately. Confirm the API watcher, its child, and Python exit and both ports are reusable. Repeat after deliberately stopping either owned backend; the sibling must exit and the launcher must fail.
- Check real no-face/multiple-face fixtures and same-person/different-person pairs through Python and NestJS. Compare an exact-threshold controlled result, inconsistent boolean, non-finite distance, invalid counts, excessive response body, and delayed response. Reject invalid provider results as unavailable rather than mismatch/success.
- Send invalid/oversized/chunked JSON, malformed base64, path/URL strings, excessive-pixel images, and extra fields directly to Python. Confirm bounded fixed-message rejection without echoing inputs or creating upload files.
- While inference is running, confirm readiness responds, a concurrent inference request returns unavailable, and cancellation of one caller does not free the slot before native inference finishes.

## Final scope check

Compare outcomes with the three OpenSpec capability deltas. Confirm the result is the requested profile-only demo with private enrollment storage, transient login captures, no persistent session, and no additional dashboard or account features.
