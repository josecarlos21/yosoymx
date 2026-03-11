# Estrategia de publicación: GitHub + Cloudflare Pages

## 1) Revisión previa (rápida y no disruptiva)

- Ejecutar build local (verificar que el commit compila) antes de subir:
  - `npm ci`
  - `npm run build`
- Asegurar que no existan artefactos huérfanos rastreables que no pertenezcan a ejecución:
  - `app/.pnpm-store/`, `app/node_modules/` (no rastreables),
  - archivos huérfanos del root (`Home.js`, `Home2`) si reaparecen.
- Mantener un lockfile único:
  - usa `package-lock.json`.
  - evita `pnpm-lock.yaml` para no forzar cambios de lockfile ambiguos en CI (`npm ci`).
- Verificar que exista la ruta de administración:
  - `app/functions/api/admin/editions.ts`
  - `app/database/community.sql` con tabla `admin_editions`
- Si hay cambios de contenido, actualizar `app/info.md` para reflejar estructura real.

## 2) Subida directa a GitHub

### Setup inicial
- Crear repo remoto en GitHub (ej. `yosoy-web`) y apuntarlo al directorio actual.
- Flujo recomendado:
  - `git status`
  - `git add app/.gitignore .gitignore app/src/App.tsx app/index.html app/info.md app/DEPLOYMENT.md` + el resto del cambio real.
  - `git commit -m "Auditoría: hardening de efectos y guías de despliegue"`
  - `git branch -M main`
  - `git remote add origin git@github.com:<usuario>/<repo>.git` (o HTTPS).
  - `git push -u origin main`

### Enfocar revisión antes del merge
- Mantener nombre de rama corto con prefijo `codex/` si aplica en tu flujo:
  - `codex/auditoria-stack`.

## 3) Despliegue en Cloudflare Pages

### Opción recomendada (rápida)
1. En Cloudflare, ir a **Pages > Create > Connect to Git**.
2. Seleccionar el repo de GitHub.
3. Configurar proyecto:
   - **Build command:** `npm ci && npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `app`
4. Guardar y hacer deploy automático.

### Dominios
- Asignar ambas marcas en **Custom domains**:
  - `yosoy.mx`
  - `yosoymx.com`
- En DNS de esos dominios, verificar que Cloudflare entregue certificados y que no haya reglas de proxy que colisionen con Pages.
- Para root (`yosoy.mx`), confirmar que el DNS usa Cloudflare (Cloudflare managed cert y records adecuados).
- Mantener redirección de dominio canónico (si aplica) en Pages/worker según decisión de marca:
  - Preferente: unificar en `yosoy.mx` y redirigir `www.yosoy.mx` y `yosoymx.com` con 301.

## 4) Post-publicación

- Revisar:
  - `https://<proyecto>.pages.dev`
  - `https://yosoy.mx`
  - `https://yosoymx.com`
- Verificar:
  - Navegación ancla (id → scroll)
  - Carga de fuentes y estilos
  - Copia a portapapeles / descarga de escrito
  - Header y CTA principales
  - `GET /api/admin/editions` requiere token y responde `items` en JSON

## 5) Riesgos a vigilar

- `node_modules` o `.pnpm-store` rastreados en git (rompen historial y CI).
- archivos raíz huérfanos (`Home.js`, `Home2`) sin intención de versión (si reaparecen).
- `info.md` desfasado de la estructura real.
- Dependencias de lockfile dual (npm/pnpm) sin política explícita.
