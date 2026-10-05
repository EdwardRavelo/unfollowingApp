# Unfollowing — Extractor (extensión de Chrome)

Extrae tus listas de **seguidores** y **seguidos** de Instagram usando tu propia sesión, y las
guarda en un archivo `snapshot-YYYY-MM-DD.json` que luego importas en el dashboard.

> Usa los mismos endpoints internos que la web de Instagram. No comparte tu contraseña con nadie;
> todo corre en tu navegador. Aun así, es acceso automatizado: hazlo a ritmo razonable (el extractor
> ya mete pausas) y no lo abuses.

## Instalación (modo desarrollador)

1. Abre Chrome y ve a `chrome://extensions`.
2. Activa **Modo de desarrollador** (arriba a la derecha).
3. Clic en **Cargar descomprimida** y selecciona esta carpeta `extractor/`.
4. Fija la extensión en la barra si quieres acceso rápido.

## Uso

1. Abre **instagram.com** en una pestaña y asegúrate de tener **sesión iniciada**.
2. Haz clic en el icono de la extensión → **Extraer ahora**.
3. Verás el conteo subir (seguidores / seguidos) con pausas anti-rate-limit.
4. Al terminar, pulsa **Descargar snapshot.json** (o **Copiar al portapapeles**).
5. Importa ese archivo en el dashboard.

Repite cada pocos días: comparando dos snapshots, el dashboard te dirá **quién te dejó de seguir**.

## Notas técnicas

- La extracción se inyecta en la pestaña de Instagram (`chrome.scripting`) y corre en su contexto,
  por lo que las cookies de sesión y el CSRF token se usan de forma nativa.
- `IG_APP_ID` en `popup.js` es el app-id de la web de IG. Si algún día Instagram cambia sus
  endpoints o headers y la extracción falla, ese valor / las URLs en `popup.js` son lo único a tocar.
- Cuentas grandes: la extracción tarda más por las pausas. Es normal.
