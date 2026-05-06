import os


def _to_bool(value):
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


class Csv:
    def __init__(self, separator=",", strip=True):
        self.separator = separator
        self.strip = strip

    def __call__(self, value):
        if value is None:
            return []
        items = str(value).split(self.separator)
        if self.strip:
            items = [item.strip() for item in items]
        return [item for item in items if item]


def config(name, default=None, cast=None):
    value = os.getenv(name, default)

    if cast is None:
        return value
    if cast is bool:
        return _to_bool(value)
    if callable(cast):
        return cast(value)
    return cast(value)
