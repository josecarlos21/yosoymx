# Gaceta Tu Espacio Eje Central

Micrositio editorial en React + Vite y app iOS nativa que comparten una sola fuente canónica de contenido y tokens.

## Estructura clave

- `shared/content/issue-content.json`: contenido editorial canónico.
- `shared/design/tokens.json`: tokens por capas `N0 → N4`.
- `src/App.tsx`: shell web principal, ya data-driven.
- `functions/api/*`: Cloudflare Pages Functions para comunidad, moderación y admin.

## Desarrollo web

### Instalar y correr

- `npm ci`
- `npm run dev`

### API local sin fallback HTML

La configuración de Vite ahora proxya `/api/*` a `http://127.0.0.1:8788` por defecto. Si usas otra URL:

- `VITE_API_PROXY_TARGET=http://127.0.0.1:9999 npm run dev`

Esto evita que `vite dev` devuelva el HTML del SPA cuando el backend local sí está levantado.

## Calidad

- `npm run lint`
- `npm run test`
- `npm run build`

## Notas

- La comunidad pública solo muestra aportes aprobados.
- Los envíos nuevos quedan en `pending` hasta moderación.
- La app iOS bundlea PDFs, fotos, contenido y tokens desde este mismo repo.
