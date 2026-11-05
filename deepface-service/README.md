# Python biometric service

The browser calls NestJS. NestJS sends bounded image-only HTTP requests to this service; it receives no email, password, account profile, MinIO credentials, or database connection. Python performs detection/comparison, and NestJS maps observations into the application's responses.

## Setup from repository root (PowerShell)

```powershell
py -3.11 -m venv deepface-service/.venv
deepface-service/.venv/Scripts/python.exe -m pip install -r deepface-service/requirements.txt
Copy-Item deepface-service/.env.example deepface-service/.env
Push-Location deepface-service
.venv/Scripts/python.exe -m app.prepare_models
Pop-Location
npm.cmd run dev
```

If Python 3.11 is already installed at a different path, use that executable for the virtualenv command. The requirements file pins the complete resolved runtime, including DeepFace 0.0.104, ONNX Runtime 1.31.1, FastAPI 0.162.0, Uvicorn 0.54.0, and Pillow 13.0.0. CPU inference does not require TensorFlow, PyTorch, CUDA, or a GPU.

Model preparation downloads approximately 537 MB of VGG-Face weights and two OpenCV cascade files. It initializes both models and prints the effective threshold. Weights are cached under this service's `.deepface/weights/`; `DEEPFACE_HOME` can select a writable parent of `.deepface/`. Do not commit this cache, the virtualenv, `.env`, or user image fixtures. A model-weight cache is allowed; uploaded images and embeddings must remain request-local.

## Configuration

Defaults are loopback `127.0.0.1:8000`, `VGG-Face`, `opencv`, `cosine`, and `onnx`. The initial supported model/detector/metric/engine combination is fixed to these values. Detection and alignment are enforced. Anti-spoofing is disabled; this demo has no liveness check.

Blank `DEEPFACE_DISTANCE_THRESHOLD` uses the pinned model's default 0.68. A finite override in the range 0-2 changes the cosine-distance acceptance threshold. Smaller distances indicate a closer match. The legacy AWS `FACE_SIMILARITY_THRESHOLD=95` must be removed; startup rejects that setting with migration guidance rather than interpreting it as a distance.

Keep `api/.env`'s `DEEPFACE_BASE_URL` aligned with this service's host/port. The combined launcher validates this relationship. Browser configuration contains only the NestJS URL. Inference HTTP requests default to a 30-second deadline in NestJS, independently of the launcher's 180-second startup deadline.

## Standalone commands

From `deepface-service/`:

```powershell
.venv/Scripts/python.exe -m app.prepare_models
.venv/Scripts/python.exe -m app
```

From the repository root, `npm.cmd run dev:api` starts NestJS alone, and `npm.cmd run dev:web` starts Vite. Standalone Python uses one Uvicorn worker. Restart the pair after Python source/configuration changes; NestJS TypeScript changes are watched automatically.

For a different interpreter, set `$env:PYTHON_EXECUTABLE = 'C:/path/to/python.exe'` before `npm.cmd run dev`. Set `$env:DEV_STARTUP_TIMEOUT_MS = '300000'` if initialized startup legitimately needs more time. Install dependencies and provision weights explicitly rather than relying on the launcher to install anything.

## Internal HTTP contract

| Endpoint | Request | Response |
| --- | --- | --- |
| `GET /health/ready` | None | `{ status: "ready", model, detector, metric }` once initialization succeeds |
| `POST /detect` | JSON `{ imageBase64 }` | `{ faceCount }` |
| `POST /compare` | JSON `{ referenceBase64, candidateBase64 }` | `invalid_faces` counts, or a `compared` result |

The face-count branch contains exactly `status`, `referenceFaceCount`, and `candidateFaceCount`. A comparison occurs only with one face in each image, and its response also includes `distance`, `threshold`, `verified`, `model`, `detector`, and `metric`. No largest-face selection or detection bypass is used. NestJS checks result types/numbers and consistency before applying application rules.

Requests accept strict base64 strings, not paths or URLs. The actual streamed JSON body is capped at 14 MiB before parsing; each decoded JPEG/PNG is limited to 5,242,880 bytes, one frame, and 20 million pixels. Inputs are fully decoded in memory. Error responses contain fixed messages rather than submitted values or provider diagnostics; access-body logging is disabled. Responses use `Cache-Control: no-store`.

One inference slot is admitted at a time. Capacity remains occupied until native work finishes even if its HTTP caller disconnects or times out; concurrent excess requests return unavailable. Readiness remains responsive during inference. NestJS caps provider responses at 64 KiB and does not automatically retry inference.

## Troubleshooting

- Missing interpreter/package: recreate the Python 3.11 virtualenv and install the pinned requirements; check `PYTHON_EXECUTABLE` if overridden.
- Model preparation/load failure: check GitHub access, cache disk space/permissions, and the pinned environment. Initialization failure never reports ready. Pre-provision the cache before an offline run.
- Port unavailable: stop the process that owns it or change both Python's port and NestJS's base URL. The launcher stops only its own processes.
- Startup deadline: use standalone commands to inspect the failing service; an unready model is different from a ready process.
- Inference unavailable: the worker may be stopped, busy, timed out, or have failed inference. NestJS returns a retryable 503 rather than a successful match.
- Previously enrolled reference rejected: the new detector may handle an image differently. Preserve the original reference and investigate it; do not weaken the single-face rule or delete accounts to bypass the failure.
