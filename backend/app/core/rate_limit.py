from collections import defaultdict, deque
from threading import Lock
from time import monotonic

from app.core.config import get_settings


class LoginRateLimiter:
    def __init__(self, max_attempts: int, window_seconds: int, lockout_seconds: int) -> None:
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.lockout_seconds = lockout_seconds
        self._attempts: dict[str, deque[float]] = defaultdict(deque)
        self._locked_until: dict[str, float] = {}
        self._lock = Lock()

    def retry_after(self, keys: list[str]) -> int:
        now = monotonic()
        with self._lock:
            waits = [max(0, int(self._locked_until.get(key, 0) - now) + 1) for key in keys]
            return max(waits, default=0)

    def record_failure(self, keys: list[str]) -> None:
        now = monotonic()
        cutoff = now - self.window_seconds
        with self._lock:
            for key in keys:
                attempts = self._attempts[key]
                while attempts and attempts[0] < cutoff:
                    attempts.popleft()
                attempts.append(now)
                if len(attempts) >= self.max_attempts:
                    self._locked_until[key] = now + self.lockout_seconds
                    attempts.clear()

    def reset(self, keys: list[str]) -> None:
        with self._lock:
            for key in keys:
                self._attempts.pop(key, None)
                self._locked_until.pop(key, None)


settings = get_settings()
login_rate_limiter = LoginRateLimiter(
    max_attempts=settings.login_max_attempts,
    window_seconds=settings.login_window_seconds,
    lockout_seconds=settings.login_lockout_seconds,
)
