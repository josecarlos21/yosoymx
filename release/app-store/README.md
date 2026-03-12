# Paquete App Store · Gaceta Eje Central

## Carpetas
- `ios/icons/`: iconos maestros y variantes listas para referencia de release.
- `ios/launch/`: preview visual del launch screen actual.
- `ios/screenshots/iphone-6.9/`: screenshots listos para App Store Connect.
- `ios/screenshots/ipad-13/`: screenshots listos para App Store Connect.
- `web/brand/`: favicon pack, wordmark y recursos base de marca.
- `web/og/`: OG assets 1200 × 630.
- `metadata/es-MX/`: textos listos para pegar en App Store Connect.
- `deeplinks/`: AASA y mapa de rutas.

## Orden recomendado de screenshots
1. `01-portada.png`
2. `02-ruta.png`
3. `03-biblioteca.png`
4. `04-comunidad.png`
5. `05-soporte.png`

## Carga sugerida en App Store Connect
- App Name: ver `metadata/es-MX/app-store-fields.json`
- Subtitle: ver `metadata/es-MX/subtitle.txt`
- Promotional Text: ver `metadata/es-MX/promotional-text.txt`
- Description: ver `metadata/es-MX/description.txt`
- Keywords: ver `metadata/es-MX/keywords.txt`
- Support URL: ver `metadata/es-MX/support-url.txt`
- Marketing URL: ver `metadata/es-MX/marketing-url.txt`
- App Review Notes: ver `metadata/es-MX/review-notes.txt`

## Recordatorios operativos
- No subir a testers externos hasta que `https://yosoymx.com/api/*` responda JSON sin challenge HTML.
- Validar que `/.well-known/apple-app-site-association` se sirva sin redirect y con `application/json`.
- La página pública de privacidad queda en `https://yosoymx.com/privacy`.
