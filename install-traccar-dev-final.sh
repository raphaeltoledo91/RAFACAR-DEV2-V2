#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/traccar-pro-frontend}"
APP_NAME="${APP_NAME:-traccar-pro-frontend}"
TRACCAR_URL="${TRACCAR_URL:-https://gps2.rafacarrastreadores.com.br}"
PORT="${PORT:-3000}"
POLLING_MS="${POLLING_MS:-30000}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/opt/${APP_NAME}-backup-${STAMP}"

bold(){ printf "\033[1m%s\033[0m\n" "$*"; }
ok(){ printf "✅ %s\n" "$*"; }
warn(){ printf "⚠️  %s\n" "$*"; }
fail(){ printf "❌ %s\n" "$*"; exit 1; }
need_cmd(){ command -v "$1" >/dev/null 2>&1 || fail "Comando obrigatório não encontrado: $1"; }

bold "============================================================"
bold "TRACCAR DEV FINAL v5.1 - INSTALAÇÃO REVISADA"
bold "============================================================"

if [ "${EUID}" -ne 0 ]; then
  fail "Execute como root: sudo bash install-traccar-dev-final.sh"
fi

need_cmd bash
need_cmd rsync
need_cmd curl
need_cmd npm
need_cmd node

NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])")"
if [ "${NODE_MAJOR}" -lt 20 ]; then
  fail "Node.js 20+ obrigatório. Atual: $(node -v). Instale Node 22 LTS antes de continuar."
fi

if [ ! -f "${SCRIPT_DIR}/package.json" ] || [ ! -f "${SCRIPT_DIR}/server.js" ] || [ ! -f "${SCRIPT_DIR}/src/main.jsx" ]; then
  fail "Execute este script de dentro da pasta extraída do pacote traccar-dev-final."
fi

bold "1) Backup do projeto atual"
if [ -d "${APP_DIR}" ]; then
  mkdir -p "${BACKUP_DIR}"
  rsync -a --exclude node_modules --exclude dist --exclude logs "${APP_DIR}/" "${BACKUP_DIR}/"
  ok "Backup criado em ${BACKUP_DIR}"
else
  warn "Pasta ${APP_DIR} ainda não existe. Será criada."
fi

bold "2) Publicando arquivos revisados"
mkdir -p "${APP_DIR}"
rsync -a --delete \
  --exclude node_modules \
  --exclude dist \
  --exclude logs \
  --exclude data/config.local.json \
  "${SCRIPT_DIR}/" "${APP_DIR}/"
ok "Arquivos base copiados"

bold "3) Preservando configuração e ícones existentes"
mkdir -p "${APP_DIR}/data" "${APP_DIR}/public/vehicle-icons"
if [ -f "${BACKUP_DIR}/data/config.local.json" ]; then
  cp "${BACKUP_DIR}/data/config.local.json" "${APP_DIR}/data/config.local.json"
  ok "Configuração anterior preservada"
elif [ ! -f "${APP_DIR}/data/config.local.json" ]; then
  cp "${APP_DIR}/data/config.local.example.json" "${APP_DIR}/data/config.local.json"
  python3 - <<PY
import json
from pathlib import Path
p = Path('${APP_DIR}/data/config.local.json')
data = json.loads(p.read_text())
data['traccarUrl'] = '${TRACCAR_URL}'
data['port'] = int('${PORT}')
data['pollingMs'] = int('${POLLING_MS}')
p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
PY
  warn "Configuração nova criada. Edite token/usuário/senha em ${APP_DIR}/data/config.local.json"
fi
chmod 600 "${APP_DIR}/data/config.local.json" || true

if [ -d "${BACKUP_DIR}/public/vehicle-icons" ]; then
  rsync -a "${BACKUP_DIR}/public/vehicle-icons/" "${APP_DIR}/public/vehicle-icons/"
  ok "Ícones existentes preservados"
fi

bold "4) Instalando dependências"
cd "${APP_DIR}"
npm install
ok "Dependências instaladas"

bold "5) Auditoria 1: sintaxe do servidor"
npm run check:server
ok "server.js válido"

bold "6) Auditoria 2: build do frontend"
npm run build
ok "Build gerado em ${APP_DIR}/dist"

bold "7) Auditoria 3: ESLint"
if npm run lint; then
  ok "ESLint sem erro crítico"
else
  warn "ESLint retornou avisos/erros. O build já foi validado; revise a saída acima se houver regra customizada."
fi

bold "8) Subindo com PM2"
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi
pm2 stop "${APP_NAME}" >/dev/null 2>&1 || true
pm2 delete "${APP_NAME}" >/dev/null 2>&1 || true
pm2 start ecosystem.config.cjs --only "${APP_NAME}"
pm2 save || true
ok "PM2 iniciado"

bold "9) Teste local"
sleep 2
curl -fsS "http://127.0.0.1:${PORT}/api/health" || warn "Health local ainda não respondeu. Verifique pm2 logs ${APP_NAME}."
printf "\n"
ok "Instalação concluída"

bold "Próximos comandos úteis"
printf "cd %s\n" "${APP_DIR}"
printf "sudo nano %s/data/config.local.json\n" "${APP_DIR}"
printf "pm2 logs %s --lines 100\n" "${APP_NAME}"
printf "curl -i http://127.0.0.1:%s/api/health\n" "${PORT}"
printf "curl -s http://127.0.0.1:%s/api/bootstrap | head -c 1000\n" "${PORT}"
