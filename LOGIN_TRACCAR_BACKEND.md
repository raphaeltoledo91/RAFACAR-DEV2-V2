# Login RAFACAR DEV2 com credenciais do Traccar

O painel usa as próprias credenciais do Traccar para cada usuário.

## Fluxo seguro

1. Usuário abre o painel.
2. Frontend mostra tela de login.
3. Usuário informa usuário/e-mail e senha do Traccar.
4. Frontend envia para `/api/auth/login`.
5. Backend autentica no Traccar em `/api/session`.
6. Backend guarda o cookie do Traccar em memória por sessão.
7. Backend cria cookie local `HttpOnly`.
8. Frontend nunca recebe a senha nem o cookie real do Traccar.

## Endpoints

```txt
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

Sem login, `/api/bootstrap`, `/api/snapshot`, `/api/command-types`, `/api/send-command` e `/api/traccar/*` retornam `401`.

Servidor Traccar: `https://gps2.rafacarrastreadores.com.br`.
