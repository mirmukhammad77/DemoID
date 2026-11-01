# HTTP API

Base: `http://127.0.0.1:3000/api`. All endpoints are POST. No authentication cookie or token is issued. Responses have `Cache-Control: no-store`. Provider errors and secrets are not returned.

## Registration

`POST /registration/validate` accepts JSON:

```json
{
  "email": "person@example.com",
  "password": "a-long-password",
  "firstName": "Alex",
  "lastName": "Smith",
  "birthDate": "1995-03-10"
}
```

Success: **200** `{ "valid": true }`. This endpoint validates all fields and checks normalized-email availability without saving an account, password, or photo.

`POST /registration/complete` accepts multipart form fields with the same five values and one file part named `photo`. The browser supplies a webcam JPEG. The API repeats profile validation and email uniqueness checks; it validates image bytes and exactly one face with DetectFaces, saves the private reference in MinIO, then commits the account.

Success: **201** `{ "message": "Registration complete" }`. A duplicate normalized email returns **409**. Storage/database/provider failures return **503**. An inserted-account failure triggers deletion of that attempt's object, with operator records if cleanup also fails.

## Login

`POST /login/credentials` accepts JSON `{ "email": "person@example.com", "password": "a-long-password" }`.

Success: **200** `{ "valid": true }`. Unknown-email and wrong-password attempts receive the same **401** `INVALID_CREDENTIALS` response. No profile, image, or provider call is needed for this step.

`POST /login/verify-face` accepts multipart `email`, `password`, and one `photo`. It checks credentials again before reference retrieval or biometric calls. The backend resolves the reference from those credentials; caller-supplied user identifiers or object keys are rejected. Prior frontend validation does not authorize this endpoint.

Successful credentials and a face match at or above the configured threshold return **200**, with exactly this shape:

```json
{
  "id": "a-user-uuid",
  "email": "person@example.com",
  "firstName": "Alex",
  "lastName": "Smith",
  "birthDate": "1995-03-10"
}
```

No password/hash, photo, object location, score, provider data, token, or response wrapper is included. Failed requests never contain profile fields. A single nonmatching face returns **401** `FACE_MISMATCH`; no/multiple detected faces return **422** `INVALID_FACE`. Dependency failures return **503** `SERVICE_UNAVAILABLE`, never a successful match. No login photos are stored and the enrollment photo is unchanged.

The frontend retains email/password only in the current flow's memory so it can send them in the second request. After a profile is returned, that state is cleared. Refreshing starts again; there is no durable session or protected-profile lookup endpoint.

## Errors and input limits

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Please check the submitted fields.",
  "fields": { "birthDate": ["birthDate must be a real past date in YYYY-MM-DD format"] }
}
```

`fields` is present only for DTO validation errors and contains messages, never submitted values.

| Status | Codes / conditions |
| --- | --- |
| 400 | `VALIDATION_ERROR`, `INVALID_REQUEST`, `INVALID_IMAGE`: invalid fields, unknown properties, malformed multipart, invalid or missing image |
| 401 | `INVALID_CREDENTIALS`, `FACE_MISMATCH` |
| 409 | `EMAIL_CONFLICT` |
| 413 | `IMAGE_TOO_LARGE`: image or request exceeds the limit |
| 422 | `INVALID_FACE`: missing, multiple, or unusable detected faces |
| 503 | `SERVICE_UNAVAILABLE`: database, private storage, missing reference, AWS access, timeout, throttling, or service failure |

Email is trimmed/lowercased and limited to 254 characters. Names are trimmed and 1–100 characters. Passwords are 8–128 characters and never trimmed. Birth date must be a strict real past date in `YYYY-MM-DD` format. Unknown fields are rejected. Candidate images allow JPEG or PNG, matching MIME and byte signature, a full successful decode, a 20-million-pixel decode safety bound, and a 5,242,880-byte limit. Multipart allows one file and bounded field counts/lengths. Normal browser capture is resized to at most 1280 pixels on its longest edge.

## PowerShell request examples

```powershell
$details = @{
  email = 'person@example.com'
  password = 'a-long-password'
  firstName = 'Alex'
  lastName = 'Smith'
  birthDate = '1995-03-10'
}
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/api/registration/validate -ContentType application/json -Body ($details | ConvertTo-Json)
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/api/login/credentials -ContentType application/json -Body (@{ email = $details.email; password = $details.password } | ConvertTo-Json)
```

Use the webcam UI for normal photo submission. For an operator's manual API check, Windows `curl.exe` can submit a local image fixture directly (this is not a frontend upload feature):

```powershell
curl.exe -i -F 'email=person@example.com' -F 'password=a-long-password' -F 'photo=@capture.jpg;type=image/jpeg' http://127.0.0.1:3000/api/login/verify-face
```

Only use local disposable accounts/fixtures in manual examples; do not copy real passwords into shared shell transcripts.
