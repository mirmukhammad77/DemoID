from starlette.responses import JSONResponse

MAX_REQUEST_BYTES = 14 * 1024 * 1024


class InternalHttpMiddleware:
    """Bound the actual streamed body before JSON parsing; never spool image uploads."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        started = False

        async def safe_send(message):
            nonlocal started
            if message["type"] == "http.response.start":
                started = True
                message["headers"] = list(message.get("headers", [])) + [(b"cache-control", b"no-store")]
            await send(message)

        async def reject(status, code, message):
            await JSONResponse({"code": code, "message": message}, status_code=status)(scope, receive, safe_send)

        try:
            if scope["method"] == "POST":
                total = 0
                chunks = []
                while True:
                    message = await receive()
                    if message["type"] == "http.disconnect":
                        return
                    chunk = message.get("body", b"")
                    total += len(chunk)
                    if total > MAX_REQUEST_BYTES:
                        return await reject(413, "IMAGE_TOO_LARGE", "The image request is too large.")
                    chunks.append(chunk)
                    if not message.get("more_body", False):
                        break
                body = b"".join(chunks)
                delivered = False

                async def replay():
                    nonlocal delivered
                    if not delivered:
                        delivered = True
                        return {"type": "http.request", "body": body, "more_body": False}
                    return await receive()

                await self.app(scope, replay, safe_send)
            else:
                await self.app(scope, receive, safe_send)
        except Exception:
            if not started:
                await reject(503, "SERVICE_UNAVAILABLE", "Biometric processing is temporarily unavailable.")
