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
4. Pulsa el icono de la pieza de puzle 🧩 de la barra de Chrome y fija **Unfollowing Extractor** 📌.

**Al actualizar el código** (por ejemplo tras un `git pull`), vuelve a `chrome://extensions` y pulsa
el botón ↻ de la tarjeta de la extensión. Si Chrome pide aceptar permisos nuevos, acéptalos.
No borres la carpeta `extractor/`: Chrome la usa directamente desde ahí.

## Uso

1. Ten la **sesión iniciada** en instagram.com (si no hay pestaña abierta, la extensión la abre).
2. Haz clic en el icono de la extensión → **Extraer ahora**. Puedes cerrar el popup: sigue en segundo plano.
3. Verás el progreso contra el total de tu perfil (p. ej. `812 / 830`).
4. Al terminar, el archivo se **descarga solo** en `Descargas/unfollowing/`.
5. En el dashboard, arrástralo a **Importar**, o pulsa **Copiar** en la extensión y haz **Ctrl+V** en el dashboard.

Si sale el aviso **⚠ incompleta**, Instagram cortó la extracción: vuelve a extraer más tarde,
porque comparar con esa captura daría unfollowers falsos.

Repite cada pocos días: comparando dos snapshots, el dashboard te dirá **quién te dejó de seguir**.

## Notas técnicas

- `background.js` (service worker) orquesta todo y guarda el estado en `chrome.storage.local`;
  `popup.js` solo lo pinta. Por eso cerrar el popup no corta la extracción.
- La extracción se inyecta en la pestaña de Instagram (`chrome.scripting`) y corre en su contexto,
  por lo que las cookies de sesión y el CSRF token se usan de forma nativa. Envía el progreso y el
  resultado final al service worker con mensajes (`progress` / `done` / `error`).
- Cuando Instagram limita (429, o 200 con `status: "fail"`), reintenta con espera creciente en vez
  de cortar la lista. Además deduplica por `id` y compara con los contadores del perfil.
- `IG_APP_ID` en `background.js` es el app-id de la web de IG. Si algún día Instagram cambia sus
  endpoints o headers y la extracción falla, ese valor / las URLs en `background.js` son lo único a tocar.
- Cuentas grandes: la extracción tarda más por las pausas. Es normal.
