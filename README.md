# MAILS

Centro de correo para manejar varias cuentas desde una sola vista.

Repositorio GitHub: https://github.com/h3dtienda-prog/GMAPP

## Estado actual

- App Next.js con TypeScript y Tailwind CSS.
- Tablero inicial con bandeja unificada, metricas, cuentas y detalle de correo.
- OAuth real de Gmail con callback en Next.js.
- Tokens Gmail cifrados antes de guardarse.
- Supabase preparado para guardar conexiones Gmail en produccion.
- Vercel preparado como hosting.

## Ejecutar localmente

```bash
npm install
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Abrir [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Scripts

```bash
npm run lint
npm run build
```

## Variables de entorno

Copiar `.env.example` a `.env.local` para desarrollo.

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://127.0.0.1:3000/api/gmail/callback
GMAIL_TOKEN_ENCRYPTION_KEY=
SUPABASE_URL=
SUPABASE_SECRET_KEY=
```

`SUPABASE_SECRET_KEY` debe usarse solo en servidor o en variables de Vercel. No debe exponerse como `NEXT_PUBLIC_`.

## Supabase

La migracion esta en:

```text
supabase/migrations/20260603200751_create_gmail_connections.sql
```

Para aplicarla:

1. Crear un proyecto en Supabase.
2. Ir a **SQL Editor**.
3. Copiar y ejecutar el contenido de la migracion.
4. Copiar `SUPABASE_URL` desde Project Settings.
5. Crear o copiar una secret/service key para `SUPABASE_SECRET_KEY`.

La tabla `gmail_connections` tiene RLS activado y no incluye politicas publicas. El acceso queda pensado para backend usando clave secreta.

## Gmail OAuth

La app incluye:

- `GET /api/gmail/connect`
- `GET /api/gmail/callback`

### Local

Redirect URI autorizado en Google Cloud:

```text
http://127.0.0.1:3000/api/gmail/callback
```

### Produccion en Vercel

Cuando tengas la URL final de Vercel, agregar tambien este redirect URI en Google Cloud:

```text
https://TU-DOMINIO-VERCEL/api/gmail/callback
```

Y en Vercel configurar:

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://TU-DOMINIO-VERCEL/api/gmail/callback
GMAIL_TOKEN_ENCRYPTION_KEY=
SUPABASE_URL=
SUPABASE_SECRET_KEY=
```

## Vercel

Opcion recomendada:

1. Entrar a [Vercel](https://vercel.com/).
2. **Add New Project**.
3. Importar `h3dtienda-prog/GMAPP`.
4. Framework: Next.js.
5. Agregar las variables de entorno de produccion.
6. Deploy.

Tambien se puede desplegar con CLI:

```bash
npx vercel
npx vercel --prod
```

Despues del primer deploy, copiar la URL de produccion y actualizar `GOOGLE_REDIRECT_URI` en Vercel y Google Cloud.

## Proximos pasos

1. Crear proyecto Supabase y ejecutar la migracion.
2. Importar GitHub repo en Vercel.
3. Configurar variables en Vercel.
4. Agregar URL publica de callback en Google Cloud.
5. Probar **Activar Gmail OAuth** online.
