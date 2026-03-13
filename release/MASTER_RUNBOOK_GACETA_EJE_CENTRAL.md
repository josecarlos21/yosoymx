# Runbook Maestro · Gaceta Eje Central

## Estado objetivo
- Web pública con:
  - edición vigente en `/gaceta-eje-central`
  - archivo en `/gaceta-eje-central/archivo`
  - edición histórica en `/gaceta-eje-central/edicion/{slug}`
  - miniaturas sociales correctas por URL
  - `/.well-known/apple-app-site-association` público y sin challenge
- Backend editorial con flujo:
  - `draft -> review_ready -> published -> archived`
  - solo una edición `published`
  - `slug` único
  - comunidad moderada `pending`
- iOS con:
  - lectura de edición vigente
  - apertura por universal link/deep link
  - archive listo para TestFlight
  - screenshots de App Store regenerables

## Estado actual del repo
- Web local:
  - `npm run lint` verde
  - `npm run test -- --runInBand` verde
  - `npm run build` verde
- iOS local:
  - tests verdes
  - screenshots App Store regenerados
  - archive listo en `/tmp/GacetaIOS-release-v1.0.0-3.xcarchive`
  - versión actual: `1.0.0 (3)`
- Bloqueo externo real:
  - Cloudflare sigue devolviendo `403`/challenge en producción
  - no hay upload automático a App Store Connect desde esta sesión

## Fuente de verdad operativa
- Deploy Cloudflare: [DEPLOY_CLOUDFLARE.md](/Users/joseca/Documents/Investigacion%20y%20newsletter/app/DEPLOY_CLOUDFLARE.md)
- Release iOS: [TESTFLIGHT_INTERNAL_RELEASE.md](/Users/joseca/Documents/Investigacion%20y%20newsletter/ios/TESTFLIGHT_INTERNAL_RELEASE.md)
- Paquete App Store: [README.md](/Users/joseca/Documents/Investigacion%20y%20newsletter/release/app-store/README.md)
- Verificación ejecutada: [release-verification-2026-03-12.md](/Users/joseca/Documents/Investigacion%20y%20newsletter/release/verification/release-verification-2026-03-12.md)

## Comandos canónicos
### Web
- `cd /Users/joseca/Documents/Investigacion\ y\ newsletter/app && npm run lint`
- `cd /Users/joseca/Documents/Investigacion\ y\ newsletter/app && npm run test -- --runInBand`
- `cd /Users/joseca/Documents/Investigacion\ y\ newsletter/app && npm run build`
- `cd /Users/joseca/Documents/Investigacion\ y\ newsletter/app && npm run verify:production`

### iOS
- `bash /Users/joseca/Documents/Investigacion\ y\ newsletter/release/app-store/scripts/capture-ios-screenshots.sh`
- `bash /Users/joseca/Documents/Investigacion\ y\ newsletter/ios/scripts/prepare-testflight-release.sh`

## Secuencia exacta para cerrar producción
1. Configurar secretos y variables de GitHub/Cloudflare.
2. Crear la regla WAF de bypass descrita en [WAF_RULE_TEMPLATE.md](/Users/joseca/Documents/Investigacion%20y%20newsletter/release/cloudflare/WAF_RULE_TEMPLATE.md).
3. Verificar bindings reales de `DB` y `MEDIA_BUCKET` en Pages.
4. Mergear a `master`.
5. Esperar el workflow de Pages.
6. Ejecutar `npm run verify:production`.
7. Solo si la verificación da todo `200`, proceder con iOS.
8. Ejecutar `bash ios/scripts/prepare-testflight-release.sh`.
9. Abrir el archive en Organizer y subir a TestFlight interno.
10. Probar en iPhone real:
  - edición vigente
  - `archivo`
  - `edicion/{slug}`
  - comunidad real
  - universal links

## Criterios de go/no-go
### Go
- `/gaceta-eje-central` responde `200`
- `/gaceta-eje-central/archivo` responde `200`
- `/gaceta-eje-central/edicion/{slug}` responde `200`
- `/privacy` responde `200`
- `/.well-known/apple-app-site-association` responde `200 application/json`
- `/api/issues/current` responde JSON
- `/api/issues?limit=3` responde JSON
- `/api/community?kind=comment&limit=3` responde JSON
- sin `cf-mitigated: challenge`
- archive iOS firmado disponible

### No-go
- cualquier `403`/challenge en rutas públicas o API
- AASA bajo redirect o HTML
- edición sin preflight limpio
- screenshots desalineados con la UI actual
- build repetido en App Store Connect

## Operación editorial estándar
1. Crear draft desde la edición vigente.
2. Cambiar `slug`, `label`, `location`, `themeLine`, `publishedDate`, portada, share copy, PDFs, fuentes y media.
3. Ejecutar preflight.
4. Pasar a `review_ready`.
5. Publicar.
6. Verificar:
  - nueva edición en `/gaceta-eje-central`
  - edición previa en `/gaceta-eje-central/edicion/{slug}`
  - histórico correcto en `/archivo`

## Fail-safe y rollback
- Si el deploy rompe rutas públicas:
  - restaurar el último deploy estable de Pages
  - no tocar la edición archivada
- Si una nueva edición salió con error:
  - no editar la publicada
  - crear un nuevo draft desde la vigente o publicar una corrección como nueva edición
- Si falla AASA:
  - mantener deep link por scheme
  - no cerrar App Review hasta repararlo
- Si falla comunidad/API:
  - la app debe seguir leyendo la edición bundleada
  - no abrir testers externos

## Qué sí está listo
- código web/iOS
- flujo editorial
- archivo público
- AASA en repo
- assets y screenshots
- archive `1.0.0 (3)`
- scripts de release y verificación

## Qué sigue dependiendo de infraestructura
- autenticación real de Cloudflare
- bindings reales D1/R2
- regla WAF
- subida efectiva a App Store Connect
