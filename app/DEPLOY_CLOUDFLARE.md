# Despliegue directo: GitHub → Cloudflare Pages → yosoymx.com

## 0) Estado actual del front
- Stack: React + Vite + TypeScript (carpeta `app/`)
- Secciones nuevas: `#comentarios`, `#historial`, `#contacto`
- Descargas PDF: catálogo centralizado en `/public/pdfs` y validación de disponibilidad previa
- API comunitaria: `app/functions/api/community.ts`
- API admin: `app/functions/api/admin/editions.ts` (`GET`/`POST` con `ADMIN_TOKEN`)
- Base de datos: D1 (`app/database/community.sql`)

## 1) Variables y secretos requeridos
- GitHub Secrets:
  - `CF_API_TOKEN`  
  - `CF_ACCOUNT_ID`
  - `ADMIN_TOKEN` (token de administración)
- GitHub Variables:
  - `CLOUDFLARE_PROJECT_NAME` → `yosoymx`
  - `D1_DATABASE_ID` (uuid real de la base)
  - `CLOUDFLARE_D1_DATABASE_NAME` (ej. `yosoymx-community`)
  - `R2_BUCKET_NAME` (bucket real de media)
  - `R2_PREVIEW_BUCKET_NAME` (bucket preview)
- Política de build:
  - Bloque de package-manager: `npm ci` (requiere `package-lock.json`).
  - No permitir `pnpm-lock.yaml` para evitar ambigüedad de lockfile en CI.
- Wrangler:
  - `app/wrangler.toml` usa placeholders válidos para no romper comandos locales
  - los bindings reales de Pages se configuran en Cloudflare Dashboard
  - `ORIGIN_SITE = "https://yosoymx.com"`
- Opcional:
  - `VITE_COMMUNITY_API_URL=/api/community` (en producción se puede dejar vacío y usa ruta relativa)

## 2) Flujo recomendado de GitHub
1. Crea rama:
   - `codex/feature/comunidad-imprimir-pdf`.
   - Mantén commits por capas: UI → API → persistencia → despliegue.
2. Commit incremental:
   - código, helper y función (comunidad)
   - esquema `app/database/community.sql`
   - configuración `.github/workflows/deploy-cloudflare-pages.yml`
   - `app/wrangler.toml`
   - `app/DEPLOY_CLOUDFLARE.md`
3. Pull Request a `master` para revisión.
4. Merge a `master`.
5. GitHub Actions:
   - ejecuta `npm ci`, `npm run build`, `npm run test -- --runInBand`, `npm run lint`
   - despliega con `wrangler pages deploy dist --project-name=yosoymx --branch=master`
   - desde local (verificación puntual): `cd app && npx wrangler pages deploy dist --project-name yosoymx --branch master`

## 3) Configuración en Cloudflare Pages
1. En el panel de Pages, conecta el repositorio de GitHub y rama `master`.
2. Verifica:
   - Build command: `npm run build`
   - Output: `dist`
   - Working directory: `app/`
3. Agrega binding D1:
   - **Binding name**: `DB`
   - **Database**: `yosoymx-community`
4. Agrega binding R2:
   - **Binding name**: `MEDIA_BUCKET`
   - **Bucket**: bucket de media real
4. Añade variables de entorno:
   - `ORIGIN_SITE=https://yosoymx.com`
   - `APP_ENV=production`
   - `ADMIN_TOKEN=<token-secreto>` (configúralo en Dashboard de Pages/Variables protegidas)
5. En "Custom domains", apunta `yosoymx.com` como raíz.
6. Si deseas soporte `www`, agrega `www.yosoymx.com` y configura redirect 301 a `https://yosoymx.com`.

## 3.1) Regla crítica para clientes nativos
- El iPhone no puede resolver el challenge HTML de Cloudflare. Las rutas `yosoymx.com/api/*` deben responder siempre JSON plano.
- En WAF / Security Rules, crea una regla para `hostname eq "yosoymx.com"` y:
  - `path starts_with "/api/"`
  - o `path eq "/.well-known/apple-app-site-association"`
- Acción requerida:
  - omitir `Managed Challenge`
  - omitir `Bot Challenge` o interstitial HTML equivalente
  - permitir `GET`, `POST` y `OPTIONS` sin challenge
- Verificación mínima:
  - `curl -I https://yosoymx.com/api/issues/current` debe devolver `200` y `content-type: application/json`
  - `curl -I "https://yosoymx.com/api/community?kind=comment&limit=3"` debe devolver `200` y `content-type: application/json`
  - `curl -I https://yosoymx.com/.well-known/apple-app-site-association` debe devolver `200` y `content-type: application/json`
- Si estas rutas devuelven `403 text/html`, la app iOS cae en fallback y la comunidad no podrá refrescar ni enviar aportes.

## 4) Provisionar D1
1. Crear base:
   - `yosoymx-community`
2. Publicar schema:
   - `wrangler d1 execute yosoymx-community --file=app/database/community.sql --remote`
3. Configura `D1_DATABASE_ID` en GitHub Variables y binding `DB` en Pages.

## 5) Dominio y redirects
1. En Cloudflare Pages, agrega dominio personalizado:
   - `yosoymx.com`
2. (Opcional) agrega `www.yosoymx.com` y configura redirección a `yosoymx.com`.
3. Recomendado: forzar www -> no-www desde DNS/Redirect rules de Cloudflare.
4. Universal links:
   - publicar `/.well-known/apple-app-site-association` sin redirect
   - servirlo con `content-type: application/json`
   - excluir esa ruta de transformaciones HTML o challenge del WAF
5. Privacidad pública:
   - verificar `https://yosoymx.com/privacy`
   - usar esa URL como política de privacidad en App Store Connect

## 6) Verificación mínima post-deploy
- `https://yosoymx.com/` carga correctamente.
- `https://yosoymx.com/gaceta-eje-central`, `/archivo`, `/edicion/{slug}`, `/ruta`, `/biblioteca`, `/comunidad` y `/contacto` cargan sin 404.
- `https://yosoymx.com/privacy` carga correctamente.
- `https://yosoymx.com/.well-known/apple-app-site-association` responde JSON plano.
- Secciones ancla operan: `#comentarios`, `#historial`, `#contacto`.
- Descarga de PDF responde para cada recurso en `public/pdfs`.
- `GET /api/community?kind=comment&limit=20` y `kind=history`.
- `GET /api/issues/current`, `GET /api/issues?limit=3` y `GET /api/issues/{slug}` responden JSON.
- `POST /api/community` guarda con `moderation_status='pending'`.
- `GET /api/admin/editions` responde con `Authorization: Bearer ADMIN_TOKEN`.
- `POST /api/admin/editions` persiste `admin_editions` en D1.
- Workflow valida contrato (`community.sql`, admin endpoint, `D1_DATABASE_ID`) antes de publicar.
- Vista de impresión conserva jerarquía y enlaces visibles.
- Script reutilizable de verificación:
  - `cd app && npm run verify:production`
  - variable opcional para archivo histórico: `EDITION_SLUG=mi-edicion npm run verify:production`

## 7) Comandos Git de subida directa
1. `git add -A`
2. `git commit -m "feat: comunidad, descargas y deploy yosoymx"`
3. `git push -u origin codex/feature/comunidad-imprimir-pdf`
4. Crear PR y mergear a `master`.
