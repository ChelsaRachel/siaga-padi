#!/usr/bin/env bash
#
# Siaga Padi — local development stack orchestrator.
#
# Starts every layer the app needs, in the correct order, with one command:
#   1. Supabase self-hosted   (12 containers)  -> .supabase/docker/run.sh
#   2. Redis                  (:6379)          -> docker-compose.dev.yml
#   3. FastAPI backend        (:8020)          -> tmux window "backend"
#   4. Web dev server         (:3000)          -> tmux window "web"
#
# Layers 1-2 are containers with `restart: unless-stopped`: once Docker Desktop
# is set to start on login, they come back on their own after a reboot.
# Layers 3-4 are dev servers with hot reload, so they live in tmux where their
# logs stay readable and a crash stays visible.
#
# Usage:
#   ./scripts/dev.sh          # same as `up`
#   ./scripts/dev.sh up       # start everything, then attach to tmux
#   ./scripts/dev.sh down     # stop tmux apps and all containers
#   ./scripts/dev.sh attach   # re-attach to a running session
#   ./scripts/dev.sh status   # show container + session state
#
# Overridable via environment:
#   WEB_PORT=3001 ./scripts/dev.sh up
#   WEB_HTTPS=true ./scripts/dev.sh up   # serve web over TLS so the PWA can be
#                                        # opened from a phone on the same LAN
#
set -euo pipefail

readonly ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly SESSION="siaga-padi"
readonly REDIS_COMPOSE="${ROOT}/docker-compose.dev.yml"
readonly SUPABASE_RUN="${ROOT}/.supabase/docker/run.sh"
readonly BACKEND_DIR="${ROOT}/apps/backend"
readonly WEB_DIR="${ROOT}/apps/web"
readonly WEB_PORT="${WEB_PORT:-3000}"
readonly WEB_HTTPS="${WEB_HTTPS:-false}"

log() { printf '\033[0;36m▸ %s\033[0m\n' "$*"; }
ok()  { printf '\033[0;32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[0;33m! %s\033[0m\n' "$*"; }
die() { printf '\033[0;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# --- preflight ---------------------------------------------------------------

require_commands() {
  local missing=()
  local cmd
  for cmd in docker tmux npm; do
    command -v "$cmd" >/dev/null 2>&1 || missing+=("$cmd")
  done
  if [ ${#missing[@]} -gt 0 ]; then
    die "Perintah tidak ditemukan: ${missing[*]}. Install dulu (brew install ${missing[*]})."
  fi
}

require_docker_daemon() {
  if ! docker info >/dev/null 2>&1; then
    die "Docker daemon tidak merespons. Buka Docker Desktop dulu, tunggu sampai statusnya 'Engine running'."
  fi
}

# The backend virtualenv is standardised on `.venv/` — one name only, so a stray
# second environment can never silently shadow the one dependencies land in.
resolve_backend_python() {
  local candidate="${BACKEND_DIR}/.venv/bin/python"

  if [ -x "$candidate" ] && "$candidate" -c "import fastapi" >/dev/null 2>&1; then
    printf '%s' "$candidate"
    return 0
  fi

  die "Virtualenv backend '.venv' belum siap. Buat dulu:
  cd apps/backend && uv venv .venv && uv pip install -r requirements.txt --python .venv/bin/python
  (tanpa uv: cd apps/backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt)"
}

# --- infrastructure ----------------------------------------------------------

start_supabase() {
  log "Menyalakan stack Supabase (menunggu semua container healthy)..."
  sh "$SUPABASE_RUN" start
  ok "Supabase siap"
}

start_redis() {
  log "Menyalakan Redis..."
  docker compose -f "$REDIS_COMPOSE" up -d --wait
  ok "Redis siap di :6379"
}

stop_containers() {
  log "Mematikan Redis..."
  docker compose -f "$REDIS_COMPOSE" down
  log "Mematikan stack Supabase..."
  sh "$SUPABASE_RUN" stop
  ok "Semua container berhenti"
}

# --- application dev servers -------------------------------------------------

# Service workers only exist on a secure context, so reaching the dev server by
# LAN IP (what a phone does) needs TLS. Generate the cert on first HTTPS run.
ensure_web_cert() {
  [ "$WEB_HTTPS" = "true" ] || return 0

  if [ -f "${WEB_DIR}/certs/dev-key.pem" ] && [ -f "${WEB_DIR}/certs/dev-cert.pem" ]; then
    return 0
  fi

  log "Sertifikat dev belum ada — membuatnya..."
  (cd "$WEB_DIR" && npm run --silent dev:cert) \
    || die "Gagal membuat sertifikat dev. Jalankan manual: cd apps/web && npm run dev:cert"
}

start_apps() {
  if tmux has-session -t "$SESSION" 2>/dev/null; then
    warn "Session tmux '${SESSION}' sudah jalan — dev server tidak di-start ulang"
    return 0
  fi

  local backend_python
  backend_python="$(resolve_backend_python)"

  log "Menjalankan backend FastAPI di tmux..."
  tmux new-session -d -s "$SESSION" -n backend -c "$BACKEND_DIR" \
    "'${backend_python}' api.py; echo; echo '[backend berhenti — tekan enter untuk menutup]'; read"

  ensure_web_cert

  log "Menjalankan web dev server di tmux..."
  tmux new-window -t "$SESSION" -n web -c "$WEB_DIR" \
    "PORT='${WEB_PORT}' DEV_HTTPS='${WEB_HTTPS}' npm run dev; echo; echo '[web berhenti — tekan enter untuk menutup]'; read"

  ok "Dev server jalan di tmux session '${SESSION}'"
}

stop_apps() {
  if tmux has-session -t "$SESSION" 2>/dev/null; then
    tmux kill-session -t "$SESSION"
    ok "Session tmux '${SESSION}' dihentikan"
  fi
}

attach_session() {
  tmux has-session -t "$SESSION" 2>/dev/null \
    || die "Tidak ada session '${SESSION}'. Jalankan: ./scripts/dev.sh up"

  # Attaching needs an interactive terminal; when run from a script, CI, or an
  # agent, print how to get in instead of failing.
  if [ -n "${TMUX:-}" ]; then
    warn "Sudah di dalam tmux. Pindah dengan: tmux switch-client -t ${SESSION}"
  elif [ -t 0 ] && [ -t 1 ]; then
    tmux attach-session -t "$SESSION"
  else
    warn "Bukan terminal interaktif — attach manual dengan: tmux attach -t ${SESSION}"
  fi
}

print_urls() {
  local web_scheme="http"
  [ "$WEB_HTTPS" = "true" ] && web_scheme="https"

  printf '\n'
  ok "Web        ${web_scheme}://localhost:${WEB_PORT}"
  ok "Backend    http://localhost:8020/docs"
  ok "Supabase   http://localhost:8000"

  if [ "$WEB_HTTPS" = "true" ]; then
    local lan_ip
    lan_ip="$(ipconfig getifaddr en0 2>/dev/null || true)"
    [ -n "$lan_ip" ] && ok "Dari HP    https://${lan_ip}:${WEB_PORT}  (sertifikat self-signed → pilih 'Lanjutkan')"
  fi

  printf '\n'
  printf '  tmux attach -t %s     # lihat log backend/web\n' "$SESSION"
  printf '  Ctrl-b n / Ctrl-b p    # pindah window\n'
  printf '  Ctrl-b d               # keluar tanpa mematikan (detach)\n'
  printf '  ./scripts/dev.sh down  # matikan semuanya\n\n'
}

show_status() {
  log "Container:"
  docker compose -f "$REDIS_COMPOSE" ps 2>/dev/null || true
  sh "$SUPABASE_RUN" status 2>/dev/null || true
  printf '\n'
  log "Session tmux:"
  if tmux has-session -t "$SESSION" 2>/dev/null; then
    tmux list-windows -t "$SESSION"
  else
    printf '  (tidak ada session "%s")\n' "$SESSION"
  fi
}

# --- entrypoint --------------------------------------------------------------

main() {
  local command="${1:-up}"

  case "$command" in
    up)
      require_commands
      require_docker_daemon
      start_supabase
      start_redis
      start_apps
      print_urls
      attach_session
      ;;
    down)
      require_commands
      stop_apps
      require_docker_daemon
      stop_containers
      ;;
    attach)
      attach_session
      ;;
    status)
      require_docker_daemon
      show_status
      ;;
    *)
      die "Perintah tidak dikenal: '${command}'. Pilihan: up | down | attach | status"
      ;;
  esac
}

main "$@"
