#!/usr/bin/env bash
set -Eeuo pipefail

MESSAGE="${1:-Atualiza projeto Traccar Dev}"

if [ ! -d .git ]; then
  echo "❌ Esta pasta não é um repositório Git."
  exit 1
fi

echo "🔎 Status atual:"
git status

echo ""
echo "📦 Adicionando alterações..."
git add .

if git diff --cached --quiet; then
  echo "⚠️ Nenhuma alteração nova para commit."
else
  echo ""
  echo "📝 Criando commit..."
  git commit -m "$MESSAGE"
fi

if git remote get-url origin >/dev/null 2>&1; then
  echo ""
  echo "⬆️ Enviando para o GitHub..."
  git push
  echo "✅ Sincronização finalizada."
else
  echo "⚠️ Nenhum remote 'origin' configurado."
  echo "Depois de criar o repositório no GitHub, rode:"
  echo "git remote add origin https://github.com/SEU_USUARIO/traccar-dev.git"
  echo "git branch -M main"
  echo "git push -u origin main"
fi
