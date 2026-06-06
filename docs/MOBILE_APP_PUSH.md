# RAFACAR Mobile App e Push

## Modelo recomendado agora

O RAFACAR pode rodar no celular como PWA instalavel ou dentro de um WebView. Esta primeira base nao muda a VPS do Traccar:

- Railway hospeda o painel e o proxy.
- O celular instala o app a partir do navegador.
- O service worker `public/sw.js` melhora cache e experiencia de app.
- `mobile/capacitor` prepara um APK Android/WebView usando Capacitor.
- `.github/workflows/android-mobile.yml` gera APK debug direto pelo GitHub Actions.
- Pushover recebe alertas por endpoint seguro no backend.

## Instalar no celular

Abra o dominio da Railway no Chrome/Android ou Safari/iPhone e use:

- Android: menu do Chrome > Instalar app ou Adicionar a tela inicial.
- iPhone: Compartilhar > Adicionar a Tela de Inicio.

O modulo `Integracoes` mostra um botao de instalacao quando o navegador permitir.

## APK Android/WebView

O pacote mobile fica separado para nao interferir no deploy web da Railway:

```text
mobile/capacitor
```

Para gerar APK sem usar a maquina local:

- Abra o GitHub do projeto.
- Va em `Actions`.
- Rode `Build Android APK`.
- Baixe o artefato `rafacar-android-debug-apk`.

Esse APK debug e para teste funcional. Para Play Store, crie assinatura release com secrets do GitHub e mantenha `google-services.json` fora do repositorio ate fechar o fluxo de build assinado. Deixei um modelo em `mobile/capacitor/google-services.example.json`.

## Pushover

Configure na Railway:

```env
PUBLIC_APP_URL=https://rafacar-dev2-production.up.railway.app
PUSHOVER_APP_TOKEN=token_do_app_pushover
PUSHOVER_USER_KEY=user_key_do_pushover
PUSHOVER_DEVICE=
PUSHOVER_SOUND=pushover
PUSHOVER_PRIORITY=0
TRACCAR_WEBHOOK_SECRET=troque-por-um-segredo-forte
```

Para ambiente local ou homologacao com arquivo JSON, use:

```text
data/notifications.local.json
```

Esse arquivo e ignorado pelo Git. O modelo versionado fica em:

```text
data/notifications.example.json
```

Depois de publicar, teste no painel:

- Entre com usuario admin do Traccar.
- Abra `Integracoes`.
- Clique em `Testar Pushover`.

## Webhook do Traccar para Pushover

Endpoint pronto:

```text
POST https://rafacar-dev2-production.up.railway.app/api/webhooks/traccar/pushover?secret=SEU_SEGREDO
```

Use esse endpoint em uma notificacao Web/Webhook do Traccar. O segredo deve ser igual ao `TRACCAR_WEBHOOK_SECRET` da Railway.

## Firebase / FCM

O projeto esta preparado para receber configuracao Web/Firebase por variaveis, sem commitar segredo:

```env
FIREBASE_VAPID_KEY=
FIREBASE_WEB_CONFIG_JSON={"apiKey":"","authDomain":"","projectId":"","storageBucket":"","messagingSenderId":"","appId":""}
```

Tambem deixei um modelo em `data/firebase.web.example.json`.

Para app Android nativo via WebView/Play Store, o proximo passo e criar o projeto Firebase Android e baixar o `google-services.json`. Esse arquivo nao deve entrar publico no GitHub sem revisar o fluxo final de build.
