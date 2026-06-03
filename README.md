# MAILS

Centro de correo para manejar varias cuentas desde una sola vista.

## Estado actual

- App Next.js con TypeScript y Tailwind CSS.
- Tablero inicial con bandeja unificada, metricas, cuentas y detalle de correo.
- Datos mock para validar experiencia antes de conectar credenciales reales.
- Base preparada para agregar Gmail OAuth como primera integracion.

## Ejecutar localmente

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Abrir [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Scripts

```bash
npm run lint
npm run build
```

## Proximo paso

La siguiente etapa es completar la conexion real:

1. OAuth de Gmail con permisos minimos.
2. Guardado cifrado de tokens.
3. Sincronizacion inicial de mensajes.
4. Modelo de datos para cuentas, emails, etiquetas y seguimientos.
5. Envio de respuesta desde la cuenta correcta.

## Gmail OAuth local

La app ya incluye:

- `GET /api/gmail/connect`
- `GET /api/gmail/callback`
- Guardado local cifrado en `.data/gmail-connection.json`

### 1. Crear credenciales en Google Cloud

1. Entrar a [Google Cloud Console](https://console.cloud.google.com/).
2. Crear o seleccionar un proyecto.
3. Ir a **APIs & Services** y habilitar **Gmail API**.
4. Ir a **Google Auth Platform** y configurar la pantalla de consentimiento.
5. En **Audience**, dejar la app en modo de prueba y agregar tu Gmail como test user.
6. En **Clients**, crear un cliente OAuth de tipo **Web application**.
7. Agregar este redirect URI autorizado:

```text
http://127.0.0.1:3000/api/gmail/callback
```

### 2. Crear `.env.local`

Copiar `.env.example` a `.env.local` y completar:

```bash
GOOGLE_CLIENT_ID=tu-client-id
GOOGLE_CLIENT_SECRET=tu-client-secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:3000/api/gmail/callback
GMAIL_TOKEN_ENCRYPTION_KEY=una-frase-larga-secreta-para-cifrar-tokens
```

Despues reiniciar el servidor:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

### 3. Probar

Abrir [http://127.0.0.1:3000](http://127.0.0.1:3000) y tocar **Activar Gmail OAuth**.

Si Google muestra `redirect_uri_mismatch`, revisar que el redirect URI en Google Cloud sea exactamente:

```text
http://127.0.0.1:3000/api/gmail/callback
```
