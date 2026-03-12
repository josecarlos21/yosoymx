# Release interna TestFlight

## Estado esperado antes de subir
- `xcodebuild test -project GacetaIOS.xcodeproj -scheme GacetaIOS -destination 'id=5A528975-81A5-4AAA-ACED-F153F1A412F6'`
- `xcodebuild -project GacetaIOS.xcodeproj -scheme GacetaIOS -destination 'generic/platform=iOS' -archivePath /tmp/GacetaIOS.xcarchive archive`
- `https://yosoymx.com/api/issues/current` responde `200` JSON sin challenge
- `https://yosoymx.com/api/community?kind=comment&limit=3` responde `200` JSON sin challenge

## Versión base
- `CFBundleShortVersionString`: `1.0.0`
- `CFBundleVersion`: `1`
- Si App Store Connect ya tiene builds para `com.yosoymx.gacetaejecentral`, incrementa solo `CFBundleVersion`.

## Estrategia recomendada
1. Abrir el archive en Xcode Organizer.
2. Validar firma, versión y assets.
3. Subir primero a `TestFlight interno`.
4. Verificar comunidad real desde un iPhone con la API ya liberada en Cloudflare.
5. Solo después abrir `TestFlight externo`.

## Review notes sugeridas
- La pestaña `Comunidad` usa moderación previa; no hay publicación instantánea.
- No se requiere cuenta social para leer el contenido principal.
- El correo en comunidad es opcional y solo se usa para seguimiento editorial si hace falta.

## Bloqueos reales
- Si `/api/*` sigue bajo challenge HTML de Cloudflare, la app nativa no podrá refrescar comunidad ni edición remota.
- Si la Mac no tiene sesión activa de App Store Connect, el entregable queda en archive listo, no en upload completo.
