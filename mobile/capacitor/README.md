# RAFACAR Android/WebView

Este pacote cria um app Android com Capacitor carregando o painel publicado na Railway:

```text
https://rafacar-dev2-production.up.railway.app
```

Ele fica separado do projeto web principal para nao quebrar o deploy da Railway.

## Gerar APK de teste pelo GitHub

1. Abra o repositorio no GitHub.
2. Entre em `Actions`.
3. Rode o workflow `Build Android APK`.
4. Baixe o artefato `rafacar-android-debug-apk`.

O APK debug serve para teste funcional. Para Play Store, configure assinatura release com secrets do GitHub.

## Gerar localmente se houver ambiente Android

```bash
cd mobile/capacitor
npm install
npm run android:add
npm run android:sync
npm run android:debug
```

O arquivo de teste fica em:

```text
mobile/capacitor/android/app/build/outputs/apk/debug/app-debug.apk
```

## Configuracao

- `capacitor.config.json` define o nome do app, package id e URL Railway.
- `www/index.html` e apenas fallback visual enquanto a WebView inicializa.
- Pushover roda no backend Railway, entao o APK nao precisa guardar token.
- Firebase Android pode ser adicionado depois copiando `google-services.example.json` para `google-services.json`, mantido fora do GitHub ate configurar assinatura e secrets.
