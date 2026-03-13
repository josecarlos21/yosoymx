# Playbook Editorial · Publicar nueva edición

## Objetivo
Publicar una edición nueva sin sobrescribir la anterior y sin romper archivo, SEO ni miniaturas.

## Flujo
1. Entrar a `/admin`.
2. Crear draft desde la edición vigente.
3. Completar:
  - `slug`
  - `label`
  - `location`
  - `themeLine`
  - `publishedDate`
  - `share.title`
  - `share.summary`
  - `share.quote`
  - portada con `src`, `alt`, `caption`
  - PDFs, fuentes, autoridades y media
4. Validar preflight.
5. Corregir cualquier hard-block.
6. Mover a `review_ready`.
7. Publicar.

## Qué debe pasar después
- la nueva edición queda en `/gaceta-eje-central`
- la anterior queda en `/gaceta-eje-central/edicion/{slug-anterior}`
- `/gaceta-eje-central/archivo` lista ambas
- la miniatura social de la nueva edición sigue:
  - `edition.socialAssetId`
  - o `brand.defaultOgAssetId`
  - o `/og-default.png`

## Nunca hacer
- editar una edición `published` o `archived` in-place
- reutilizar un `slug`
- publicar con placeholders, links rotos o portada sin `alt`
- usar fixtures para simular producción

## Checklist corta
- preflight sin errores
- `slug` nuevo y único
- portada con `alt` y `caption`
- al menos una fuente visible
- OG correcto
- archivo visible
- verificación manual en:
  - `/gaceta-eje-central`
  - `/gaceta-eje-central/archivo`
  - `/gaceta-eje-central/edicion/{slug}`
