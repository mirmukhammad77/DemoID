# Manual acceptance checklist

No automated tests are supplied. Run `npm.cmd run build` and `npm.cmd run typecheck`, then use disposable local accounts and the steps below. Live face outcomes require a real webcam, local MinIO, and backend AWS credentials. Record unavailable prerequisites as blocked rather than assuming success.

## Account and storage setup

- Start storage twice; confirm the bucket initializer succeeds both times and an existing object survives. Confirm anonymous object GET returns AccessDenied.
- Run `npm.cmd run db:migrate` twice: the first fresh run applies one migration, the next applies zero. Restart the API and confirm committed accounts remain.
- Start the API without required settings and confirm startup fails with a safe message. Start with a threshold outside 0–100 and confirm it fails.
- Verify `.env` files, database files, reference photos, and generated builds are excluded from Git. Check frontend settings contain no provider credentials.

## Registration

- Enter valid profile details: only the webcam step opens and no account/photo exists yet. Leave the flow and confirm no account was created.
- Check malformed email, missing fields, blank names, too-long names, short/long passwords, extra fields, impossible dates, today, and future dates. Confirm errors appear on step one without echoing submitted passwords.
- Allow the camera, capture, preview, retake, and submit one clear face. Confirm one private reference and one account are stored and only completion confirmation is returned.
- Try the registered email with different case and spaces. Confirm 409 without changing its profile or image. Finish two requests for the same new email concurrently: one succeeds and one conflicts; no surviving reference is deleted.
- Submit empty, oversized, corrupt, unsupported, MIME-mismatched, no-face, and multiple-face images through the API as operator fixtures. Confirm rejection and no completed account.
- Stop MinIO or deny AWS access and submit a fresh valid enrollment. Confirm no reported success or login-visible partial account. Restore dependencies.
- Force an insert failure after upload and inspect cleanup; if deletion is unavailable, confirm a safe orphan record is created. Compare account references to bucket keys after any interrupted attempt.

## Login

- Enter a wrong password or unknown email: both return the same 401 and do not activate the camera. Correct credentials return only `{ valid: true }` and open the webcam step.
- Call the final face endpoint directly with invalid/missing credentials and a photo. It must reject before a reference retrieval or biometric call. Extra user identifiers/object keys must be rejected.
- Use the enrolled person's fresh capture. Confirm login returns exactly id, email, firstName, lastName, and birthDate, without tokens, cookies, image locations, hashes, scores, or provider metadata.
- Use a different person's face with the account's valid credentials: confirm mismatch, no profile, and a recapture option. Check no-face and multiple-face captures are rejected.
- Rename/remove only a disposable account's reference, stop storage, or deny AWS permission. Confirm 503 without a profile; restore the dependency afterward.
- Compare MinIO objects, database contents, and application logs before/after successful and failed login attempts: login images must not persist and references must remain unchanged.
- Reload after success: profile and credentials disappear, and sign-in starts from step one. Inspect URLs and browser storage for absence of passwords, captures, and profile data.

## Webcam interface

- Verify desktop and narrow mobile layouts, form labels, keyboard navigation, loading state, and duplicate-submit prevention.
- Deny camera access, disconnect the camera, or occupy it elsewhere: confirm an actionable message, retry control, and no file picker.
- Check capture, retake, leaving a step, switching registration/login, and submission completion stop the active camera tracks and release image preview URLs.
- Navigate away while an HTTP request or camera request is pending. Confirm no stale completion changes the new flow and late media streams are stopped.
- Change details after returning from capture: backend validation must run again. A credential rejection on final submission returns to login step one without its previous capture.

## Final scope check

Compare outcomes with the three OpenSpec capability deltas. Confirm the result is the requested profile-only demo with private enrollment storage, transient login captures, no persistent session, and no additional dashboard or account features.
