# RAFACAR DEV2 V2.1

Painel RAFACAR para rastreamento Traccar, monitoramento de cameras, evidencias e uso em WebView/PWA.

## Modulos principais

- Dashboard com mapa em tempo real, lista de frota e foco automatico no veiculo selecionado.
- Monitoramento com vinculo de camera por dispositivo Traccar.
- Evidencias com imagens ao vivo e registros salvos.
- Relatorios com mapa, playback e area de imagens/evidencias do veiculo.
- Assistente IA operacional com escopo por veiculo unico ou multiplos veiculos.
- Comandos, atributos traduzidos, integracoes e configuracao operacional.

## Servidores

- Traccar: `https://gps2.rafacarrastreadores.com.br`
- Media: `http://mtx.getautoflow.com.br`

As credenciais de usuarios continuam sendo informadas apenas no login e mantidas em sessao protegida no backend.

## Variaveis de ambiente

```env
TRACCAR_URL=https://gps2.rafacarrastreadores.com.br
MEDIA_MTX_URL=http://mtx.getautoflow.com.br
POLLING_MS=30000
ALLOW_UNSAFE_GOOGLE_TILES=true
SESSION_TTL_MS=28800000
COOKIE_SAMESITE=lax
COOKIE_SECURE=true
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
```

`GEMINI_API_KEY` e opcional. Sem ela, o assistente usa as respostas operacionais locais.

## Vercel

O projeto esta preparado para Vercel com frontend Vite em `dist` e API serverless em `api/index.js`.

```bash
npm ci
npm run build
```

O deploy de producao e feito pelo projeto Vercel `rafacar-dev-2-v2` conectado ao repositorio GitHub.

## Testes

```bash
npm run check:server
npm run lint
npm run audit:prod
npm run build
```

Para testes visuais, use Playwright no WSL Ubuntu 22.04.
