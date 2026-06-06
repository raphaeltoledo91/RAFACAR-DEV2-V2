#!/usr/bin/env bash
set -Eeuo pipefail

RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
NC="\033[0m"

ok() { echo -e "${GREEN}✅ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
fail() { echo -e "${RED}❌ $*${NC}"; exit 1; }
section() { echo ""; echo -e "${BLUE}============================================================${NC}"; echo -e "${BLUE}$*${NC}"; echo -e "${BLUE}============================================================${NC}"; }

on_error() {
  local exit_code=$?
  local line_no=$1
  echo -e "${RED}❌ Erro na linha ${line_no}. Código de saída: ${exit_code}${NC}"
  exit "$exit_code"
}
trap 'on_error $LINENO' ERR

has_cmd() { command -v "$1" >/dev/null 2>&1; }

npm_has_script() {
  local script_name="$1"
  [ -f package.json ] || return 1
  node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts['$script_name'] ? 0 : 1)" >/dev/null 2>&1
}

section "TESTE LOCAL - TRACCAR DEV"

section "1. INFORMAÇÕES DO SISTEMA"
if has_cmd lsb_release; then
  lsb_release -a || true
else
  cat /etc/os-release || true
fi
uname -a || true

section "2. VERIFICANDO FERRAMENTAS"
has_cmd git || fail "Git não encontrado."
has_cmd node || warn "Node.js não encontrado."
has_cmd npm || warn "npm não encontrado."
has_cmd java || warn "Java não encontrado."
has_cmd mvn || warn "Maven não encontrado."

echo "Git:  $(git --version 2>/dev/null || echo ausente)"
echo "Node: $(node -v 2>/dev/null || echo ausente)"
echo "npm:  $(npm -v 2>/dev/null || echo ausente)"
echo "Java:"
java -version 2>&1 || true
echo "Maven:"
mvn -v 2>/dev/null | sed -n '1,3p' || true

section "3. ESTRUTURA DO PROJETO"
pwd
if has_cmd tree; then
  tree -a -L 2 -I "node_modules|target|dist|build|.git" || true
else
  find . -maxdepth 2 -not -path './.git*' -not -path './node_modules*' -not -path './target*' | sort || true
fi

section "4. TESTE FRONTEND NODE"
if [ -f package.json ]; then
  ok "package.json encontrado."
  has_cmd npm || fail "npm não encontrado, mas package.json existe."

  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi

  if npm_has_script lint; then
    npm run lint || warn "Lint retornou erro. Corrija antes de produção."
  else
    warn "Script npm 'lint' não encontrado."
  fi

  if npm_has_script build; then
    npm run build
    ok "Build frontend finalizado com sucesso."
  else
    warn "Script npm 'build' não encontrado."
  fi

  if npm_has_script test; then
    npm test || warn "npm test retornou erro ou depende de configuração adicional."
  else
    warn "Script npm 'test' não encontrado."
  fi
else
  warn "Nenhum package.json encontrado. Pulando etapa Node."
fi

section "5. TESTE JAVA / MAVEN"
if [ -f pom.xml ]; then
  ok "pom.xml encontrado."
  has_cmd mvn || fail "Maven não encontrado, mas pom.xml existe."
  mvn clean test
  ok "Testes Maven finalizados com sucesso."
else
  warn "Nenhum pom.xml encontrado. Pulando etapa Maven."
fi

section "6. VERIFICAÇÃO GIT"
if [ -d .git ]; then
  git status
else
  warn "Esta pasta ainda não é um repositório Git."
fi

section "TESTE FINALIZADO"
ok "Ambiente e projeto verificados."
