# Assets do app

Use esta pasta para icone e splash nativos do Capacitor.

Arquivos recomendados:

- `icon.png`: 1024x1024 PNG.
- `splash.png`: 2732x2732 PNG.

Depois rode, em um ambiente Node/Android:

```bash
npx @capacitor/assets@latest generate --android
```

O PWA ja usa `public/brand/rafacar-app-icon-512.png`. Para loja Android, gere uma versao 1024x1024 da mesma identidade visual antes de assinar o release.
