import sys

import uvicorn

from app.settings import read_settings


def main():
    try:
        settings = read_settings()
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 1
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, workers=1, access_log=False)
    return 0


if __name__ == "__main__":
    sys.exit(main())
