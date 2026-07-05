# Unfollowing 👀

Plataforma para **medir tus seguidores y seguidos de Instagram** y detectar **quién te ha dejado de
seguir recientemente**, además de otras métricas de relación. Todo **local**, sin servidor ni cuentas.

## Por qué está partido en dos piezas

Instagram **no** ofrece ninguna API oficial —ni gratis ni de pago— para leer la lista de quién te
sigue. La única forma es usar tu propia sesión en el navegador. Por eso:

| Pieza | Qué hace |
|-------|----------|
| [`extractor/`](./extractor) | Extensión de Chrome que baja tus listas desde IG con tu sesión y genera un `snapshot.json`. |
| [`dashboard/`](./dashboard) | Web app (React + Vite) que importa los snapshots, los compara en el tiempo y muestra el análisis. |

El contrato entre ambas piezas es el archivo de snapshot: ver [`SNAPSHOT_FORMAT.md`](./SNAPSHOT_FORMAT.md).

## Flujo de uso

1. Instala el extractor (`extractor/README.md`) y pulsa **Extraer ahora** → descarga un `snapshot-*.json`.
2. Abre el dashboard (`cd dashboard && npm install && npm run dev`) e **importa** ese archivo.
3. Repite la extracción cada pocos días. Con 2+ capturas, el dashboard detecta **unfollowers**.

## Funcionalidades del dashboard (v1)

- **Resumen** con conteos, ratio y evolución (gráfico temporal).
- **Te dejaron de seguir** (unfollowers) con la fecha detectada.
- **No te siguen de vuelta** / **fans que no sigues**.
- **Nuevos seguidores**.
- **Historial** de cambios entre capturas.
- Búsqueda, filtros (verificado / privado) y **exportar a CSV** en cualquier lista.

## Desarrollo

```bash
cd dashboard
npm install
npm run dev      # servidor de desarrollo
npm test         # tests del motor de comparación (Vitest)
npm run build    # build de producción
```

En la pantalla **Importar** hay un botón *"Cargar datos de ejemplo"* para probar el dashboard sin
necesitar el extractor.

## Roadmap (siguientes ideas)

- Detección de *ghost followers* / cuentas sospechosas.
- Lista de "vigilados" con alertas cuando alguien importante te deja de seguir.
- Comparar dos snapshots arbitrarios (no solo consecutivos).
- Soporte para la exportación oficial de datos de Instagram como fuente alternativa.
- PWA instalable para usar el dashboard offline.

## Privacidad

Tus datos nunca salen de tu equipo: el extractor genera un archivo local y el dashboard lo guarda en
**IndexedDB** del navegador. No hay backend ni telemetría.
