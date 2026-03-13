# Verificación de release

Fecha: 2026-03-12

## Cobertura automatizada ejecutada

- Web:
  - `npm run lint`
  - `npm run test -- --runInBand`
  - `npm run build`
  - `npm run verify:production`
- iOS:
  - `xcodebuild -project ios/GacetaIOS.xcodeproj -scheme GacetaIOS -destination 'generic/platform=iOS Simulator' build`
  - `xcodebuild test -project ios/GacetaIOS.xcodeproj -scheme GacetaIOS -destination 'id=5A528975-81A5-4AAA-ACED-F153F1A412F6'`
  - `bash release/app-store/scripts/capture-ios-screenshots.sh`
  - `bash ios/scripts/prepare-testflight-release.sh`
  - `xcodebuild -project ios/GacetaIOS.xcodeproj -scheme GacetaIOS -destination 'generic/platform=iOS' -archivePath /tmp/GacetaIOS-release-v1.0.0-3.xcarchive archive`

## Cobertura funcional validada

- Archivo editorial:
  - la web resuelve edición vigente, archivo y edición por `slug`
  - la ruta `/gaceta-eje-central/archivo` ya no replica la portada completa; muestra una landing corta de archivo + cards del historial
  - el admin bloquea publicación sin `review_ready`
  - el admin muestra preflight con bloqueos y advertencias
- Comunidad:
  - en producción no se generan posts ficticios cuando falla la API
  - en localhost sí existe fallback local para desarrollo
- SEO / miniaturas:
  - `applyBrandHead` respeta precedencia `edition.socialAssetId -> brand.defaultOgAssetId -> fallback`
  - AASA incluye `/gaceta-eje-central/archivo` y `/gaceta-eje-central/edicion/*`
- iOS:
  - deep links y universal links soportan `edicion/{slug}`
  - si el `slug` falla, la app mantiene fallback seguro a la edición vigente

## Prueba visual ejecutada

- Web local:
  - portada pública validada en `http://127.0.0.1:4173/gaceta-eje-central`
  - archivo público validado en `http://127.0.0.1:4173/gaceta-eje-central/archivo`
  - captura móvil de portada guardada en `release/verification/screenshots/web/web-home-mobile.png`
- iOS simulador:
  - portada validada en iPhone 16 Pro Max
  - biblioteca validada por ruta interna
  - comunidad validada con estado de fallo seguro sin texto técnico ni payload JSON
  - screenshots App Store regenerados con script para iPhone 6.9 e iPad 13
  - capturas guardadas en:
    - `release/verification/screenshots/ios/ios-home.png`
    - `release/verification/screenshots/ios/ios-library.png`
    - `release/verification/screenshots/ios/ios-community.png`
    - `release/app-store/ios/screenshots/iphone-6.9/*.png`
    - `release/app-store/ios/screenshots/ipad-13/*.png`

## Hallazgos visuales resueltos

- Web:
  - la landing de archivo antes cambiaba el `title` pero seguía renderizando el artículo completo
  - quedó corregido para que el historial tenga lectura propia
- iOS:
  - la comunidad ya no expone mensajes técnicos al fallar la API
  - el estado visible en simulador muestra copy editorial y CTA funcional

## Build listo para subida

- app archive generado en `/tmp/GacetaIOS-release-v1.0.0-3.xcarchive`
- bundle id: `com.yosoymx.gacetaejecentral`
- versión: `1.0.0`
- build: `3`

## Estado actual de bloqueo externo

La verificación de producción (`npm run verify:production`) falló con challenge global de Cloudflare. Persisten respuestas `403 text/html` con `cf-mitigated: challenge` en:

- `https://yosoymx.com/gaceta-eje-central`
- `https://yosoymx.com/gaceta-eje-central/archivo`
- `https://yosoymx.com/gaceta-eje-central/edicion/primera-edicion`
- `https://yosoymx.com/privacy`
- `https://yosoymx.com/api/issues/current`
- `https://yosoymx.com/api/issues?limit=3`
- `https://yosoymx.com/api/community?kind=comment&limit=3`
- `https://yosoymx.com/.well-known/apple-app-site-association`

Mientras Cloudflare siga imponiendo challenge al dominio público y a `/.well-known/apple-app-site-association`, la validación final en producción/TestFlight queda incompleta aunque el código local ya esté en verde.
