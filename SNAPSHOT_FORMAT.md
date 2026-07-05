# Formato de Snapshot (contrato extractor ↔ dashboard)

El extractor genera un archivo JSON con esta forma. El dashboard lo importa, valida
`schemaVersion` y lo guarda en su historial. Es el único punto de acoplamiento entre
las dos piezas: mientras el extractor produzca este formato, el dashboard funciona.

```jsonc
{
  "schemaVersion": 1,
  "capturedAt": "2026-07-04T12:00:00.000Z",   // ISO 8601, momento de la extracción
  "source": "chrome-extension",               // "chrome-extension" | "instagram-export" | "manual"
  "account": {
    "userId": "123456789",                     // id numérico de tu cuenta (estable)
    "username": "mi_usuario"
  },
  "followers": [ /* array de User */ ],
  "following": [ /* array de User */ ]
}
```

### Objeto `User`

```jsonc
{
  "id": "987654321",          // OBLIGATORIO. id numérico estable. La comparación se hace por aquí.
  "username": "alguien",      // OBLIGATORIO. puede cambiar en el tiempo.
  "fullName": "Nombre Real",  // opcional
  "isVerified": false,        // opcional
  "isPrivate": false,         // opcional
  "profilePic": "https://..." // opcional (url del avatar)
}
```

### Reglas
- La identidad de un usuario es su `id`, **no** su `username` (el username puede cambiar).
- `capturedAt` debe ser único-ish por captura; el dashboard ordena el historial por esta fecha.
- Campos opcionales pueden faltar; el dashboard usa valores por defecto seguros.
- Si en el futuro cambia el formato, se incrementa `schemaVersion` y el dashboard migra o rechaza.
