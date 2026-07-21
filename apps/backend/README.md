# Backend (FastAPI) — Running `api.py`

This template runs a FastAPI service. The application entry point is `api.py`.

## Requirements

- Python 3.10+
- Access to the backing services referenced in `.env` (MongoDB/Redis/Elasticsearch/Kafka/PostgreSQL, etc.) if you use endpoints that depend on them

## 1) Setup (virtualenv)

Run the commands from this folder so `.env` is found and loaded correctly.

```bash
cd .builder/template/be-python

python3.10 -m venv .venv
source .venv/bin/activate

pip install -U pip wheel
```

## 2) Install dependencies

This template ship with a `requirements.txt`. Install dependencies for your project/environment.


```bash
pip install -r requirements.txt
```

## 3) Environment configuration (`.env`)

- A `.env` file already exists in this folder.
- `config/base.py` loads `.env` from the current working directory.

Recommended workflow:

1. Keep the env file named `.env`.
2. Run the server from this folder (see the next section).

Note:

- Avoid running `source .env` in your shell when values contain special characters like `$` (shell expansion can change the value). Let the app load `.env`.

## 4) Run the API

Important: run using `python api.py ...`. Do **not** run `uvicorn api:app ...`.

`api.py` parses CLI arguments at import time, so using the `uvicorn` CLI often fails with “unrecognized arguments”.

### Development (auto-reload)

With the default `--worker=1`, `api.py` enables `reload=True`.

```bash
python api.py --port 8020
```

Open:

- Swagger UI: http://localhost:8020/docs
- OpenAPI JSON: http://localhost:8020/openapi.json

### Multi-worker

If `--worker > 1`, `api.py` automatically disables reload.

```bash
python api.py --port 8020 --worker 4
```

## 5) CLI options

| Option | Default | Description |
|--------|---------|-------------|
| `-p`, `--port` | `8020` | HTTP port |
| `-worker`, `--worker` | `1` | Uvicorn worker count (reload auto-off when `> 1`) |
| `--routers` | `None` | Include specific routers (comma-separated) |
| `-uenv`, `--update_env` | `None` | Override env values: `"KEY=VAL KEY2=VAL2"` |
| `-fenv`, `--file_env` | `.env` | Env file argument (simplest: keep using `.env`) |

### Available routers

`api.py` can include these routers:

- `auth`
- `group`
- `permission`
- `user`

Run only a subset:

```bash
python api.py --routers auth,user --port 8020
```

You can also set `ENABLED_ROUTERS` in `.env` (comma-separated). If empty, all routers are enabled.

## 6) Monitoring endpoint

- Threadpool stats: http://localhost:8020/monitoring/threadpool

## Troubleshooting

- `ValidationError`: usually means required env vars are missing/invalid. Check `.env` and make sure required keys are filled.
- `ModuleNotFoundError`: install the missing Python package.
- `.env` not applied: ensure you ran `cd .builder/template/be-python` before running `python api.py ...`.
- `Address already in use`: change `--port` or stop the process using that port.

