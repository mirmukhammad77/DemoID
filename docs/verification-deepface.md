# DeepFace change verification

Verified on 2026-11-05 on Windows with Node.js 25.2.1 and a fresh project Python 3.11.17 virtual environment. This records `refactor-api-and-adopt-deepface`; [verification.md](verification.md) preserves the earlier AWS implementation's evidence.

The complete Python dependency set is pinned in `deepface-service/requirements.txt`. Checks used DeepFace 0.0.104, CPU ONNX Runtime 1.31.1, OpenCV 5.0.0.93, FastAPI 0.162.0, and Uvicorn 0.54.0. `pip check` reported no broken requirements. VGG-Face and both OpenCV cascades were initialized in the ignored cache; the effective cosine threshold was 0.68.

## Build, structure, and migration compatibility

- Workspace build and typecheck passed for NestJS and React/Vite. All NestJS modules are under `api/src/modules/`, with separate controllers, application services, repository, provider client, DTOs, and entity. HTTP/Multer objects and HTTP exceptions remain in transport handling.
- A clean build emitted `api/dist/src/main.js`, the compiled migration runner, and `api/dist/migrations/initial.migration.js`. Source/watch and a separate compiled API both served public endpoints.
- The relocated initial migration was byte-for-byte identical to its pre-refactor source. A disposable fresh database applied one migration, then zero. A database created with the original migration applied zero after relocation and retained exact account/hash/reference fields. An already committed registration remained usable from the compiled API.
- HTTP checks covered normalized fields, untrimmed passwords, invalid/missing/extra fields, date/length limits, generic credential errors, and rejection of caller-supplied reference/model/threshold fields.
- Upload checks covered JPEG/PNG, missing/empty/truncated/unsupported images, MIME disagreement, excessive pixels, extra files, and the 5,242,880-byte limit.

## Real inference and private storage

Public fixtures came from the [DeepFace unit-test dataset](https://github.com/serengil/deepface/tree/master/tests/unit/dataset) and remained in ignored disposable files. These checks used the real model, separately from controlled protocol/error responses.

| Case | Observed outcome |
| --- | --- |
| Four single-face dataset images | One detected face each |
| `img1.jpg` / `img2.jpg` | Match, distance 0.416251 |
| `img1.jpg` / `img3.jpg` | Mismatch, distance 0.916573 |
| `img1.jpg` / `img4.jpg` | Match, distance 0.434493 |
| Uniform no-face image | Zero faces |
| Two-face composite | Two faces, with no largest-face selection |

- Public enrollment/login worked through NestJS, real Python inference, SQLite, and the existing private MinIO service, without Rekognition credentials or calls. Accepted references matched their uploaded bytes; anonymous retrieval returned 403.
- Matching login returned exactly five profile fields, no cookie/token, and `Cache-Control: no-store`. Mismatch, no-face, multiple-face, and missing-reference attempts returned the expected 401/422/503 outcomes without profiles. Repeated login left reference bytes and object count unchanged.
- A separate compiled API verified the already enrolled reference and preserved its password hash. The unchanged original-image format required no embedding migration.
- Controlled insertion failure after a real MinIO upload removed that attempt's object. Controlled deletion failure wrote the cleanup journal; its disposable orphan was then removed. Concurrent email claims against real SQLite/MinIO produced one account and one conflict while preserving the winning reference.
- A compiled API pointed at an unavailable worker returned sanitized 503 for enrollment and credential-valid login, created no partial account, and preserved its private reference. A real storage connection failure also mapped to unavailable.
- Accounts/references created in the active application database/bucket were explicitly tracked and removed. Unrelated container data/references were preserved. Temporary fixture databases and images remain excluded from Git.

## Protocol and concurrency

- Controlled HTTP responses covered missing/extra fields, invalid counts, non-finite values, inconsistent verification flags, wrong model metadata, malformed/oversized results, partial-response timeout, and service failures. NestJS rejected these as unavailable. An exact-threshold result succeeded; an above-threshold result produced mismatch.
- Credential rejection prevented reference retrieval and Python calls. Internal requests contained only images, without account/profile/storage credentials.
- Python rejected malformed JSON/base64, paths/URLs, extra fields, oversized images, excessive pixels, and a streamed body exceeding 14 MiB. Fixed errors did not echo inputs or private diagnostics; uploads were not spooled to disk.
- Readiness responded during inference; excess concurrent work returned unavailable. Cancelling a caller kept capacity occupied until native work finished, then allowed a new request.
- Invalid model/detector/metric/engine settings, invalid distance thresholds, and the retired similarity setting were rejected. Provider failures were never treated as matches.

## Development lifecycle

- `npm.cmd run dev` started both backends, loaded their own environment files, labeled logs, and announced readiness only after API reachability and initialized Python readiness.
- Isolated checks covered missing interpreter/packages, invalid launcher/API/Python settings, occupied ports, and startup timeout. Failures returned nonzero and cleaned up owned children. Occupied-port checks left the other running backend pair untouched.
- Deliberately terminating either test backend stopped its sibling, returned nonzero, left no owned descendants, and permitted immediate port reuse.
- A real Windows Ctrl+C event in a separate hidden console on isolated ports ran the launcher's interrupt handler, stopped both backend trees, exited successfully, and released both ports. The terminal tool's raw Ctrl+C byte was not used as evidence of a Windows console event.

## Browser acceptance and limits

Headless Edge used synthetic camera streams made from the public fixtures and called real NestJS/Python/MinIO. No production mock mode or frontend source change was added.

- Wrong credentials kept the camera inactive. Registration exercised field validation, capture, preview, retake, and completion.
- Login exercised pending/disabled submission, denied camera permission/retry, back navigation, real mismatch/recapture, and five-field profile display.
- Tracks stopped after capture, back navigation, flow changes, and completion. No file picker appeared. Refresh cleared credentials/profile, and browser persistent storage remained empty.
- Browser fetches targeted NestJS only. The 390-pixel viewport had no horizontal overflow, and no runtime JavaScript exception was observed.

These fixture results verify implementation branches, not general biometric accuracy or liveness. Physical webcam hardware was not tested. Repeatable setup and manual checks are in [manual-verification.md](manual-verification.md), [architecture.md](architecture.md), and the [Python guide](../deepface-service/README.md).
