# Auditoría UI/UX — BotManagerWeb

Fecha: 31/10/2026 · Alcance: las 4 pantallas (Bots, Running now, History, Devices), el menú lateral, los 9 modales y los estados de carga, error y vacío. Revisado sobre el código (`src/`) y la app corriendo contra los Control Rooms reales en un viewport de 375 px.

Objetivo pedido: que la app se parezca al **Control Room de Automation Anywhere**.

Severidad: **Alta** = confunde o bloquea una tarea · **Media** = la hace más lenta o propensa a error · **Baja** = pulido.

## Resumen

La app funciona y es accesible en lo básico (diálogos nativos, foco, lectores de pantalla). Los problemas principales son tres:

1. **No habla el idioma del Control Room.** Los nombres de las secciones, la estructura del menú y los estados de las ejecuciones no coinciden con lo que el usuario ve todos los días en la web de AA.
2. **Faltan las herramientas de trabajo del Control Room**: buscar un bot, ver el estado de un vistazo, ir directo de "lancé un bot" a "verlo correr".
3. **Los errores técnicos llegan crudos** ("Request failed with status code 401").

## Hallazgos

### Arquitectura de información y terminología

| # | Hallazgo | Sev. | Recomendación |
|---|---|---|---|
| 1 | Las secciones se llaman "Bots", "Running now", "History" y "Devices". En el Control Room son **Automation**, **Activity › In progress**, **Activity › Historical** y **Manage › Devices**. El usuario tiene que traducir mentalmente. | Alta | Usar los nombres y la agrupación del Control Room en el menú y en los títulos. |
| 2 | El menú es una lista plana de 4 ítems, sin los grupos del Control Room (Activity, Manage). | Media | Menú lateral oscuro con grupos, como el panel de navegación del Control Room. |
| 3 | El header muestra siempre "Bot Manager / Automation Anywhere", y cada pantalla repite su título grande debajo. Se gasta espacio vertical y no queda claro dónde estoy. | Media | El header muestra la ruta de la sección ("Activity / In progress"), como el breadcrumb del Control Room, y el título de página queda una sola vez. |
| 4 | Estados de ejecución con nombres propios ("Running", "Idle") en vez de los del Control Room ("In progress", "Completed", "Run failed"). | Media | Usar las etiquetas del Control Room, con icono y color. |

### Tareas principales

| # | Hallazgo | Sev. | Recomendación |
|---|---|---|---|
| 5 | No se puede buscar un bot. La carpeta "Windows 10" tiene más de 20 subcarpetas y hay que scrollear y adivinar. El Control Room tiene buscador en Automation. | Alta | Buscador que filtre la carpeta actual mientras se escribe. |
| 6 | En la fila de un bot solo el botón ▶ (44 px) lanza el bot; tocar el nombre no hace nada. | Media | Toda la fila abre "Run bot now". El sheet sigue pidiendo la cuenta, así que no hay riesgo de lanzar por error. |
| 7 | Después de lanzar un bot, el aviso de éxito solo dice "Follow its progress in Running now". Para verlo hay que cerrar, abrir el menú y navegar. | Media | Botón "View in progress" en el aviso de éxito, que lleva directo a la pantalla. |
| 8 | En Devices, las acciones se desactivan sin explicación cuando el equipo está offline. | Media | Texto que explique por qué ("Available when the device is connected"). |
| 9 | En "Bot inputs", la acción principal ("Run") es un botón chico arriba a la derecha, lejos del pulgar y separado del formulario. | Media | Botón "Run bot now" fijo abajo, a todo el ancho. |
| 10 | En History las fechas son largas ("Completed, 10/31/2026, 08:52:55 AM") y difíciles de escanear en una lista. | Baja | Fechas relativas ("Today, 08:52", "Yesterday, 19:10") y la completa en el detalle. |

### Feedback, errores y estados

| # | Hallazgo | Sev. | Recomendación |
|---|---|---|---|
| 11 | Los errores muestran el mensaje técnico de axios: "Request failed with status code 401", "Network Error". No dicen qué pasó ni qué hacer. | Alta | Traducir los errores a lenguaje claro: sin conexión, sesión rechazada, Control Room caído, bot no encontrado. El detalle técnico queda como texto secundario. |
| 12 | La carga es un spinner a pantalla completa: la pantalla queda en blanco y salta cuando llegan los datos. | Media | Filas "esqueleto" con la forma de la lista. |
| 13 | El polling (cada 5 s en Devices y cada 10 s en In progress) sigue corriendo con la app en segundo plano. Gasta batería y datos móviles sin que nadie mire. | Media | Pausar el polling cuando la app no está visible y refrescar al volver. |
| 14 | Solo Devices muestra cuándo se actualizó por última vez. | Baja | Mostrar "Updated hh:mm:ss" también en In progress. |

### Accesibilidad y ergonomía táctil

| # | Hallazgo | Sev. | Recomendación |
|---|---|---|---|
| 15 | Hay objetivos táctiles por debajo de 44 × 44 px: los ítems del breadcrumb (~28 px de alto) y los botones del paginador (40 px). | Media | Llevarlos a 44 px como mínimo. |
| 16 | El estado se comunica con una luz de color más un texto: correcto. Pero en History el estado va en una línea secundaria junto a la fecha. | Baja | Etiqueta de estado propia (icono + texto), como las del Control Room. |
| 17 | Contraste: el texto secundario (`#626d73` sobre `#e4e6e1`) da ~4,6:1, justo en el límite AA. | Baja | Subir el contraste en la paleta nueva. |

### Lo que ya está bien (y se mantiene)

- Diálogos nativos `<dialog>` con foco inicial en la acción segura, Esc, el botón atrás de Android y foco devuelto al cerrar.
- Switch nativo con polyfill, mensajes de carga anunciados a lectores de pantalla y movimiento reducido respetado.
- Confirmación antes de apagar o resetear un equipo.
- Contadores de estado y refresco automático.

## Qué se implementa en esta pasada

Los 17 hallazgos, con la estética del Control Room:

- **Paleta:** grafito del logo (`#404041`) para navegación y header, área de trabajo clara, naranja de AA para la acción principal y los indicadores activos, y la franja degradada del logo como acento.
- **Tipografía:** IBM Plex Sans (enterprise, números tabulares).
- **Listas:** filas tipo tabla con etiquetas de estado.

## Segunda pasada: filtros en Historical

- **Filtros por estado y fecha en Historical**, como en el Control Room: chips de estado (All, Completed, Failed, Run aborted) y de inicio (Any time, últimas 24 horas, 7 días o 30 días).
  - El Control Room aplica el filtro (`filter` con `and`/`or` en `v3/activity/list`), así que los totales y la paginación cubren todas las ejecuciones que coinciden y no solo la página cargada.
  - Verificado contra Francisco 1: 228 ejecuciones = 131 Completed + 50 Run aborted + 47 Failed.
- Al probarlo apareció un estado que no estaba contemplado, `DEPLOY_FAILED` (8 ejecuciones), que se mostraba sin traducir. Ahora se muestra como "Deploy failed" y entra en el filtro Failed.

## Tercera pasada: tamaños de teléfono y orientación

Se recorrieron automáticamente todas las pantallas y los diálogos que se pueden abrir sin lanzar un bot. Las mediciones fueron: desborde horizontal, elementos fuera de pantalla, texto recortado y objetivos táctiles de menos de 44 px.

| Tamaño | Orientación | Resultado final |
|---|---|---|
| 320×568 (teléfono chico) | Vertical | OK |
| 360×640 (Android más común) | Vertical y horizontal | OK |
| 412×915 (teléfono grande) | Vertical | OK |
| 568×320 | Horizontal | OK |
| 915×412 | Horizontal | OK |
| 360×640 con texto al 130 % | Vertical y horizontal | OK |

### Problemas encontrados y corregidos

| Problema | Dónde | Corrección |
|---|---|---|
| En horizontal la barra, el título y los contadores ocupaban casi toda la altura: en Devices se veía medio equipo. | Todas las pantallas, a menos de 520 px de alto | Variante `land:` con barra más baja (62 → 50 px), título y subtítulo en una línea, contadores en una línea y acciones del equipo a la derecha del nombre. Ahora se ven dos equipos y medio. |
| El paginador ocupaba ~120 px y no se veía ninguna ejecución. | Historical, horizontal | Paginador en una sola fila (49 px). La lista arranca en 199 px. |
| Los chips de filtro se superponían. | Historical, horizontal | Los dos grupos van en una sola fila que se desplaza. |
| "Runs per page" medía 340 px en una pantalla de 320 y no se podía desplazar. | Diálogos centrados | Altura máxima y desplazamiento interno. |
| Los 9 botones del paginador no entraban y quedaban de 31 px; con texto grande desbordaban y el navegador achicaba toda la página. | 320 px y texto al 130 % | Container query en `rem`: si no entran, se ocultan primera/última y los números de los extremos. |
| El menú lateral medía 374 px con texto grande en una pantalla de 360. | Texto al 130 % | Ancho máximo del 85 % de la pantalla. |
| Solo se respetaban las áreas seguras de arriba y abajo. En horizontal, el notch o la barra de navegación lateral podían tapar contenido. | Horizontal | Padding con `safe-area-inset-left/right` en la barra, las pantallas, el menú y los diálogos de pantalla completa. Se toma el valor de `env()` y de las variables que inyecta Capacitor. |
| Objetivos táctiles chicos: chips de 36 px, botón "per page" de 32 px, switch de 32×16, raíz del breadcrumb de 41 px. | Varias | Todos llevados a 44 px. La fila de un switch con etiqueta se puede tocar entera. |
| Tamaños de texto en `px`, que no escalan con el tamaño de fuente del sistema. | Varias | Pasados a `rem`. Se agregó `text-size-adjust: 100%` para que Android no infle el texto en horizontal. |

### Ya estaba bien

- La orientación no está bloqueada. `configChanges` evita que la pantalla se reinicie al girar, así que no se pierde el estado.
- Con edge-to-edge (Android 15), el plugin `SystemBars` de Capacitor 8 pasa las áreas seguras al WebView y agrega padding cuando se abre el teclado, así que este no tapa los campos.

### Sin probar

- La pantalla "Bot inputs": solo se abre después de elegir una cuenta y eso puede lanzar un bot. Su diseño usa los mismos componentes medidos arriba.
- Un teléfono físico: todo se midió con la emulación del navegador.

## Queda para después

- **Pausar o detener ejecuciones desde In progress.** El Control Room lo permite, pero es una acción nueva sobre la API, no una mejora de UI.
