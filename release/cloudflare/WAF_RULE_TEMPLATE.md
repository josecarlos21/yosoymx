# Plantilla de Regla WAF · Gaceta Eje Central

## Objetivo
Evitar que Cloudflare muestre challenge HTML en rutas que deben ser consumidas por:
- app iOS nativa
- universal links
- crawlers sociales para miniaturas

## Expresión recomendada
```txt
(http.host eq "yosoymx.com" and starts_with(http.request.uri.path, "/api/"))
or
(http.host eq "yosoymx.com" and http.request.uri.path eq "/.well-known/apple-app-site-association")
or
(http.host eq "yosoymx.com" and starts_with(http.request.uri.path, "/gaceta-eje-central"))
or
(http.host eq "yosoymx.com" and http.request.uri.path eq "/privacy")
```

## Acción requerida
- Skip / Bypass:
  - Managed Challenge
  - Bot Fight / Bot Challenge
  - Browser Integrity style interstitials si están activos

## Resultado esperado
- `curl -I https://yosoymx.com/gaceta-eje-central` devuelve `200`
- `curl -I https://yosoymx.com/api/issues/current` devuelve `200` y `Content-Type: application/json`
- `curl -I https://yosoymx.com/.well-known/apple-app-site-association` devuelve `200` y `Content-Type: application/json`
- ninguna respuesta contiene `cf-mitigated: challenge`

## Verificación
- Ejecutar:
  - `cd /Users/joseca/Documents/Investigacion\ y\ newsletter/app && npm run verify:production`
