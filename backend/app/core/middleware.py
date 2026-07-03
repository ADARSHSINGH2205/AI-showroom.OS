from uuid import uuid4

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send


class SecurityHeadersMiddleware:
    def __init__(self, app: ASGIApp, production: bool = False) -> None:
        self.app = app
        self.production = production

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = str(uuid4())

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["X-Content-Type-Options"] = "nosniff"
                headers["X-Frame-Options"] = "DENY"
                headers["Referrer-Policy"] = "no-referrer"
                headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
                headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
                headers["X-Request-ID"] = request_id
                if scope.get("path", "").startswith("/api/v1"):
                    headers["Cache-Control"] = "no-store"
                    headers["Pragma"] = "no-cache"
                if self.production:
                    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            await send(message)

        await self.app(scope, receive, send_with_headers)
