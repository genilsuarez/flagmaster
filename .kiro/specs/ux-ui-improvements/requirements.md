# Requirements Document

## Introduction

FlagQuiz es una aplicación web de quiz de banderas construida con JavaScript vanilla y arquitectura MVC. La interfaz actual presenta inconsistencias visuales significativas entre sus distintos componentes: los botones tienen alturas, radios, pesos tipográficos y variantes dispares según el contexto (header del juego, bottom sheet, modales, modos individuales); los elementos de UI ocupan más espacio del necesario; y la experiencia de usuario varía notablemente entre los distintos modos de juego.

Este spec define los requisitos para homologar y unificar toda la interfaz de usuario, estableciendo un sistema de componentes coherente que mejore la compacidad, la consistencia visual y la experiencia general del usuario a lo largo de toda la aplicación.

---

## Glossary

- **Button_System**: El conjunto unificado de variantes de botón definidas en el sistema de diseño (primario, secundario, ghost, destructivo, icon-only).
- **Design_Token**: Variable CSS que encapsula un valor de diseño reutilizable (color, espaciado, tipografía, radio, sombra).
- **Bottom_Sheet**: El componente modal de configuración de modo de juego que aparece centrado en pantalla.
- **Mode_Card**: Tarjeta interactiva en la pantalla de inicio que representa un modo de juego.
- **Landing_Mode_Card**: Versión compacta de la Mode_Card integrada en el hero de la landing page.
- **Game_Header**: La barra superior del juego que contiene el título, botones de control y acciones.
- **MC_Option**: Botón de opción múltiple en los modos de juego con selección de respuesta.
- **Power_Up_Button**: Botón circular de power-up durante el juego.
- **Team_Counter**: Tarjeta de puntuación de equipo en el modo por equipos.
- **Chip**: Elemento de selección compacto tipo píldora para filtros y opciones.
- **App_Modal**: Modal genérico de la aplicación (estadísticas, logros, cómo jugar, etc.).
- **Game_End_Modal**: Modal de resultados al finalizar una partida.
- **Settings_Modal**: Modal de configuración global de la aplicación.
- **Drawer**: Panel lateral deslizante de navegación principal.
- **Timer_Bar**: Barra de progreso de tiempo en los modos con temporizador.
- **Round_Progress**: Barra de progreso de rondas completadas.
- **Streak_Indicator**: Indicador visual de racha de respuestas correctas.

---

## Requirements

### Requirement 1: Sistema de Tokens de Diseño Unificado

**User Story:** Como desarrollador, quiero un sistema de tokens de diseño centralizado y completo, para que todos los componentes de la interfaz compartan los mismos valores base y cualquier cambio global se propague automáticamente.

#### Acceptance Criteria

1. THE Design_Token SHALL definir exactamente cinco variantes de altura para botones declaradas en `:root`: `--btn-h-xs: 28px`, `--btn-h-sm: 32px`, `--btn-h-md: 36px`, `--btn-h-lg: 40px`, `--btn-h-xl: 44px`.
2. THE Design_Token SHALL definir exactamente cuatro variantes de padding horizontal para botones declaradas en `:root`: `--btn-px-sm: 12px`, `--btn-px-md: 16px`, `--btn-px-lg: 24px`, `--btn-px-xl: 32px`.
3. THE Design_Token SHALL definir exactamente tres variantes de tamaño de fuente para botones declaradas en `:root`: `--btn-fs-sm: 0.72rem`, `--btn-fs-md: 0.82rem`, `--btn-fs-lg: 0.9rem`.
4. IF el archivo `assets/styles/styles.css` ya contiene tokens de color, espaciado, radio o sombra, THEN THE Design_Token SHALL preservar sus nombres y valores exactos sin modificación.
5. WHEN un token de botón declarado en `:root` es actualizado, THE Design_Token SHALL propagar el nuevo valor a todos los selectores CSS que lo referencian mediante `var()`, sin requerir cambios adicionales en esos selectores.
6. THE Design_Token SHALL declarar todos los tokens de botón en el bloque `:root` de `assets/styles/styles.css`, de modo que sean accesibles globalmente en toda la hoja de estilos.

---

### Requirement 2: Homologación del Button_System

**User Story:** Como usuario, quiero que todos los botones de la aplicación tengan un aspecto coherente y predecible según su función, para que pueda identificar rápidamente qué acción realizará cada botón.

#### Acceptance Criteria

1. THE Button_System SHALL definir exactamente cinco variantes semánticas: `btn--primary` (acción principal, `background: var(--deep-sage)`, texto blanco), `btn--secondary` (acción secundaria, `border: 1.5px solid var(--deep-sage)`, texto sage), `btn--ghost` (acción terciaria, `border: 1px solid transparent`, texto sage), `btn--destructive` (acción peligrosa, `color: var(--rust)`), `btn--icon` (solo icono, circular).
2. THE Button_System SHALL aplicar la variante `btn--primary` con `height: var(--btn-h-lg)` (40px) a todos los botones de inicio de partida: `#startButton`, `.bottom-sheet__play-btn`, `.parametrization__play-btn`, `.geo-puzzle-guess-btn`, `.word-drop-guess-btn`.
3. THE Button_System SHALL aplicar la variante `btn--ghost` con `height: var(--btn-h-sm)` (32px) a todos los botones de saltar pregunta: `.game-btn--skip`, `.mode-skip-btn`, `.geo-puzzle-skip-btn`.
4. THE Button_System SHALL aplicar la variante `btn--destructive` con `height: var(--btn-h-sm)` (32px) a todos los botones de terminar/abandonar partida: `.game-btn--end`, `.word-drop-end-btn`.
5. THE Button_System SHALL aplicar la variante `btn--secondary` con `height: var(--btn-h-md)` (36px) a todos los botones de acción secundaria en modales y sheets: `.bottom-sheet__reset-btn`, `.settings-modal__cancel`, `.game-end-modal__btn--home`.
6. THE Button_System SHALL aplicar la variante `btn--icon` con `width: 32px` y `height: 32px` a todos los botones de cierre: `.bottom-sheet__close-btn`, `.app-modal__close`, `.settings-modal__close`, `.drawer-close`.
7. WHEN un botón está en estado `disabled`, THE Button_System SHALL aplicar `opacity: 0.45` y `cursor: not-allowed` de forma consistente en todas las variantes, sobreescribiendo cualquier valor de opacidad definido a nivel de componente.
8. WHEN un botón recibe foco mediante `:focus-visible`, THE Button_System SHALL mostrar `outline: 2px solid var(--deep-sage)` con `outline-offset: 2px` en todas las variantes excepto `btn--destructive`, que usará `outline-color: var(--rust)`.
9. THE Button_System SHALL definir las variables `--btn-h-lg`, `--btn-h-md` y `--btn-h-sm` en `:root` antes de referenciarlas en los selectores de variante.

---

### Requirement 3: Compactación del Game_Header

**User Story:** Como usuario, quiero que la barra superior del juego sea más compacta, para que la bandera y las opciones de respuesta tengan más espacio visible sin necesidad de hacer scroll.

#### Acceptance Criteria

1. THE Game_Header SHALL tener `padding: var(--space-sm) var(--space-md)` (8px vertical) en lugar del actual `var(--space-lg)` (20px vertical).
2. THE Game_Header SHALL mostrar el título `h1` con `font-size: 1.1rem` y `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` para evitar desbordamiento de texto.
3. THE Game_Header SHALL alinear en una sola fila el título, el botón de saltar y el botón de terminar usando `display: flex; align-items: center` sin que el contenedor genere scroll horizontal en viewports de 320px de ancho mínimo.
4. WHEN el juego no ha comenzado, THE Game_Header SHALL mostrar únicamente el botón `#startButton` con la variante `btn--primary` de altura 40px, y los botones de saltar y terminar SHALL tener el atributo `hidden`.
5. WHILE el juego está en curso, THE Game_Header SHALL mostrar los botones de saltar y terminar con las variantes `btn--ghost` y `btn--destructive` respectivamente (ambos de altura 32px), y el botón `#startButton` SHALL tener el atributo `hidden`.
6. THE Game_Header SHALL mantener el gradiente de fondo `linear-gradient(135deg, var(--deep-sage) 0%, var(--sage) 100%)` y el borde inferior de 3px con `var(--terracotta)`.

---

### Requirement 4: Compactación del Bottom_Sheet

**User Story:** Como usuario, quiero que el panel de configuración de modo de juego sea más compacto y quepa completamente en pantallas móviles sin scroll, para que pueda configurar y lanzar una partida de forma rápida.

#### Acceptance Criteria

1. THE Bottom_Sheet SHALL tener `max-height: 70vh` y `overflow-y: auto` para contener el scroll dentro del panel, con padding interno de `var(--space-sm) var(--space-md) var(--space-md)`.
2. WHERE el ancho del Bottom_Sheet supere 320px, THE Bottom_Sheet SHALL mostrar los campos de filtro (continente, soberanía, cantidad) en un layout de dos columnas (`display: grid; grid-template-columns: 1fr 1fr`), reduciendo la altura total del formulario respecto al layout de una columna.
3. THE Bottom_Sheet SHALL usar controles de formulario con `height: var(--btn-h-sm)` (32px) para los elementos `select` e `input[type="number"]`.
4. THE Bottom_Sheet SHALL mostrar el botón de jugar con la variante `btn--primary` de `height: var(--btn-h-lg)` (40px) y `width: 100%`.
5. IF existe configuración local guardada en `localStorage`, THEN THE Bottom_Sheet SHALL mostrar el botón de restablecer con la variante `btn--ghost` de `height: var(--btn-h-sm)` (32px) y `width: 100%`.
6. WHEN el pool de países filtrados es menor a 5, THE Bottom_Sheet SHALL aplicar el atributo `disabled` al botón de jugar y mostrar el mensaje de advertencia con `color: var(--rust)` y `font-size: var(--fs-body-sm)`.
7. THE Bottom_Sheet SHALL usar `Chip` para todas las opciones de modo cuyo `type` sea `'select'` y tengan entre 2 y 4 valores posibles, en lugar de elementos `<select>` desplegables.

---

### Requirement 5: Unificación de los Chips de Selección

**User Story:** Como usuario, quiero que las opciones de configuración con pocos valores se presenten como chips visuales en lugar de desplegables, para que pueda seleccionar opciones de un vistazo sin abrir menús.

#### Acceptance Criteria

1. THE Chip SHALL tener `height: var(--btn-h-sm)` (32px), `padding: 0 var(--btn-px-sm)` (12px horizontal), `border-radius: var(--radius-pill)`, `font-size: var(--btn-fs-sm)` y `font-weight: 600`.
2. IF un Chip no está seleccionado, THEN THE Chip SHALL mostrar `background: var(--warm-white)`, `border: 1.5px solid var(--warm-gray)` y `color: var(--stone)`.
3. WHEN un Chip es seleccionado, THE Chip SHALL cambiar a `background: var(--soft-sand)`, `border-color: var(--deep-sage)` y `color: var(--deep-sage)` con `transition: background 120ms ease, border-color 120ms ease, color 120ms ease`; y todos los demás Chips del mismo grupo SHALL volver al estado no seleccionado.
4. THE Chip SHALL agruparse en un contenedor `.chip-group` con `display: flex`, `flex-wrap: wrap` y `gap: var(--space-xs)`; y WHEN el Bottom_Sheet se abre, THE Chip correspondiente al valor por defecto de la opción SHALL tener el estado seleccionado.
5. THE Bottom_Sheet SHALL usar Chip para la opción de dificultad en los modos WordDrop y GeoPuzzle, reemplazando el `<select>` actual.
6. THE Bottom_Sheet SHALL usar Chip para la opción de tipo de pregunta en CapitalClash y StreakBlitz (bandera, nombre, capital), reemplazando el `<select>` actual.
7. THE Game_End_Modal SHALL usar Chip de solo lectura para mostrar las opciones de configuración con las que se jugó la partida; los Chips de solo lectura SHALL tener `pointer-events: none`, `aria-disabled="true"` y `tabindex="-1"`.
8. WHEN un Chip recibe foco mediante `:focus-visible`, THE Chip SHALL mostrar `outline: 2px solid var(--deep-sage)` con `outline-offset: 2px`; y WHEN la tecla Enter o Space es presionada sobre un Chip enfocado, THE Chip SHALL activarse como si hubiera sido pulsado.

---

### Requirement 6: Compactación de las MC_Option (Opciones de Respuesta Múltiple)

**User Story:** Como usuario, quiero que los botones de respuesta múltiple sean más compactos pero sigan siendo fácilmente pulsables, para que la bandera y las opciones quepan en pantalla sin scroll en dispositivos móviles.

#### Acceptance Criteria

1. THE MC_Option SHALL tener `min-height: 44px` en viewports con `max-width: 767px` (mobile) y `min-height: 44px` en desktop, reduciendo los actuales 52px mientras se mantiene el mínimo táctil de accesibilidad.
2. THE MC_Option SHALL mantener `border-radius: var(--radius-md)` (8px), `border: 2px solid var(--warm-gray)` y `font-size: 0.85rem`.
3. THE MC_Option SHALL tener `min-height: 44px` en dispositivos táctiles para garantizar el área táctil mínima recomendada por WCAG 2.5.5.
4. WHEN el usuario selecciona una MC_Option correcta, THE MC_Option SHALL aplicar `border-color: var(--deep-sage)`, `background: rgba(74, 122, 80, 0.12)` y `color: var(--deep-sage)`.
5. WHEN el usuario selecciona una MC_Option incorrecta, THE MC_Option SHALL aplicar `border-color: var(--rust)`, `background: rgba(160, 75, 56, 0.12)` y `color: var(--rust)`.
6. THE MC_Option SHALL mostrar el icono de feedback (✓ o ✗) con `font-size: 1em` y `margin-left: 0.25em` de forma consistente en los modos FlagRush, CapitalClash, StreakBlitz y Supervivencia.

---

### Requirement 7: Compactación de los Team_Counter

**User Story:** Como usuario en modo por equipos, quiero que los contadores de puntuación sean más compactos, para que quepan cómodamente en pantalla junto con la bandera y los controles del juego.

#### Acceptance Criteria

1. THE Team_Counter SHALL tener `min-height: 72px` en viewports con `min-width: 768px` (desktop) y `min-height: 60px` en viewports con `max-width: 767px` (mobile), reduciendo los actuales 90px y 80px respectivamente.
2. THE Team_Counter SHALL mostrar el nombre del equipo con `font-size: 0.6rem`, `font-weight: 800`, `text-transform: uppercase` y `letter-spacing: 0.1em`.
3. THE Team_Counter SHALL mostrar la puntuación con `font-family: var(--font-display)`, `font-size: 2rem` en desktop y `font-size: 1.8rem` en mobile (reducido de los actuales 2.4rem y 2rem).
4. THE Team_Counter SHALL mantener `padding: var(--space-md) var(--space-sm)` y `border-radius: var(--radius-lg)`.
5. WHEN el cursor se posiciona sobre un Team_Counter (`:hover`), THE Team_Counter SHALL aplicar `transform: translateY(-4px)` y `box-shadow: 0 8px 24px rgba(28, 25, 23, 0.15)` con `transition: transform 150ms ease, box-shadow 150ms ease`.
6. WHEN un Team_Counter es pulsado (`:active`), THE Team_Counter SHALL aplicar `transform: translateY(-2px) scale(1.02)` como feedback visual de confirmación de pulsación.
7. THE Team_Counter SHALL mantener los gradientes de fondo diferenciados por equipo: coral (`linear-gradient(135deg, var(--coral) 0%, var(--terracotta) 100%)`), slate (`linear-gradient(135deg, var(--slate) 0%, var(--ocean) 100%)`), olive (`linear-gradient(135deg, var(--olive) 0%, var(--deep-sage) 100%)`).

---

### Requirement 8: Unificación de los Modales de la Aplicación

**User Story:** Como usuario, quiero que todos los modales de la aplicación tengan la misma estructura visual y comportamiento, para que la experiencia sea predecible independientemente del modal que se abra.

#### Acceptance Criteria

1. THE App_Modal SHALL tener `max-width: 440px` como valor por defecto, `border-radius: var(--radius-xl)`, `border: 1px solid var(--warm-gray)` y `box-shadow: var(--shadow-lifted)` de forma consistente en todos los modales.
2. THE App_Modal SHALL mostrar el header con `padding: var(--space-md) var(--space-lg)`, `border-bottom: 1px solid var(--soft-sand)`, título en `font-family: var(--font-display)` de `1.2rem` y botón de cierre `btn--icon` de 32×32px.
3. THE App_Modal SHALL mostrar el body con `padding: var(--space-md) var(--space-lg)` y `overflow-y: auto; max-height: 85vh` para contener el scroll dentro del panel.
4. THE Game_End_Modal SHALL usar la misma estructura base que App_Modal con `max-width: 400px` (sobreescribiendo el valor por defecto de 440px) y footer con botones `btn--primary` (Jugar de nuevo) y `btn--secondary` (Inicio).
5. THE Settings_Modal SHALL usar la misma estructura base que App_Modal, con footer que contenga botón `btn--ghost` (Cancelar) y botón `btn--primary` (Guardar).
6. WHEN cualquier modal es abierto, THE App_Modal SHALL aplicar `backdrop-filter: blur(8px)` y `background: rgba(28, 25, 23, 0.5)` al overlay; y WHEN el usuario hace clic en el overlay fuera del panel, THE App_Modal SHALL cerrarse.
7. WHEN la tecla Escape es presionada mientras un modal está abierto, THE App_Modal SHALL cerrarse y devolver el foco al elemento que lo abrió; en el caso del Game_End_Modal, Escape SHALL invocar el callback `onHome`.
8. WHEN un modal es abierto, THE App_Modal SHALL mover el foco al primer elemento interactivo dentro del panel (botón de cierre o primer campo de formulario).

---

### Requirement 9: Mejora de la Disposición del Área de Juego

**User Story:** Como usuario, quiero que el área de juego esté mejor organizada y sea más compacta, para que todos los elementos relevantes (bandera, opciones, puntuación) sean visibles simultáneamente sin necesidad de hacer scroll en dispositivos móviles.

#### Acceptance Criteria

1. THE Game_Header SHALL tener una altura total máxima de 52px en viewports con `min-width: 768px` (desktop) y 44px en viewports con `max-width: 767px` (mobile), liberando espacio para el contenido del juego.
2. THE Timer_Bar SHALL tener `height: 4px` (reducido de 6px) y `margin: var(--space-xs) 0` para minimizar el espacio ocupado.
3. THE Round_Progress SHALL tener `height: 4px` (reducido de 6px) y `margin: var(--space-xs) 0`.
4. THE Streak_Indicator SHALL tener `min-height: 32px` (reducido de 40px) y `padding: var(--space-xs) var(--space-md)`.
5. THE Power_Up_Button SHALL tener `width: 36px; height: 36px` en viewports con `min-width: 768px` y `width: 32px; height: 32px` en viewports con `max-width: 767px`, reduciendo los actuales 44px y 38px.
6. WHILE el juego está en curso en un viewport de 375px de ancho y 667px de alto, THE área de juego SHALL mostrar simultáneamente el Game_Header, la imagen de bandera, las MC_Option y los controles de juego (Timer_Bar, Round_Progress o Streak_Indicator) sin generar scroll vertical en el contenedor principal.

---

### Requirement 10: Consistencia de los Encabezados de Modo de Juego

**User Story:** Como desarrollador, quiero que todos los encabezados de los modos de juego individuales (FlagRush, CapitalClash, StreakBlitz, GeoPuzzle, WordDrop, Supervivencia) tengan la misma estructura y estilos, para que el código sea mantenible y la experiencia sea coherente.

#### Acceptance Criteria

1. THE Game_Header SHALL aplicar `padding: var(--space-xs) var(--space-sm)` a todos los encabezados de modo: `.flag-rush-header`, `.capital-clash-header`, `.streak-blitz-header`, `.supervivencia-header`, `.geo-puzzle-header`.
2. THE Game_Header SHALL aplicar `border-radius: var(--radius-md)` y `border: 1px solid rgba(<accent-color-rgb>, 0.2)` a todos los encabezados de modo, donde `<accent-color-rgb>` es el color de acento específico de cada modo.
3. THE Game_Header SHALL mostrar la puntuación con `font-family: var(--font-display)`, `font-size: var(--fs-score)` (1.5rem) y `font-weight: 600` de forma consistente en todos los modos.
4. THE Game_Header SHALL mostrar el contador de progreso/rondas con `font-family: var(--font-body)`, `font-size: var(--fs-body)` (0.9rem) y `color: var(--stone)` de forma consistente en todos los modos.
5. WHEN un modo de juego tiene vidas (StreakBlitz, Supervivencia, WordDrop), THE Game_Header SHALL mostrar los corazones con `font-size: 1rem` y `letter-spacing: 1px` de forma consistente.

---

### Requirement 11: Mejora de la Landing Page y las Mode_Card

**User Story:** Como usuario nuevo, quiero que la pantalla de inicio sea visualmente atractiva y que las tarjetas de modo de juego sean fácilmente distinguibles, para que pueda elegir el modo que quiero jugar de forma rápida e intuitiva.

#### Acceptance Criteria

1. THE Landing_Mode_Card SHALL tener `padding: 8px var(--space-sm)`, `border-radius: var(--radius-md)`, `border: 1.5px solid var(--soft-sand)` y `gap: 2px` de forma consistente.
2. THE Landing_Mode_Card SHALL mostrar el icono con `font-size: 1.2rem` y el nombre con `font-size: 0.72rem`, `font-weight: 600` y `color: var(--charcoal)`.
3. WHEN una Landing_Mode_Card es pulsada (`:active`), THE Landing_Mode_Card SHALL aplicar `transform: scale(0.97)` con `transition: transform 150ms ease` para dar feedback táctil.
4. WHEN una Landing_Mode_Card recibe foco mediante `:focus-visible`, THE Landing_Mode_Card SHALL mostrar `outline: 2px solid var(--deep-sage)` con `outline-offset: 2px`.
5. THE Mode_Card (en la pantalla de selección de modo) SHALL tener `padding: var(--space-lg)`, `border-radius: var(--radius-lg)`, `gap: var(--space-sm)` y `box-shadow: var(--shadow-soft)`.
6. IF la Mode_Card pertenece a la categoría Equipos, THEN THE Mode_Card SHALL mostrar el badge con `background: var(--sage)` y `color: var(--warm-white)`. IF la Mode_Card pertenece a la categoría Individual, THEN THE Mode_Card SHALL mostrar el badge con `background: var(--ocean)` y `color: var(--warm-white)`. En ambos casos el badge SHALL tener `font-size: 0.6rem` y `padding: 2px var(--space-xs)`.
7. WHEN una Mode_Card recibe foco mediante `:focus-visible`, THE Mode_Card SHALL mostrar `outline: 3px solid var(--deep-sage)` con `outline-offset: 2px`; y WHEN pierde el foco, THE Mode_Card SHALL eliminar el outline.
8. WHEN el cursor se posiciona sobre una Mode_Card (`:hover`), THE Mode_Card SHALL aplicar `transform: translateY(-2px)` y `box-shadow: var(--shadow-lifted)` con `transition: transform 150ms ease, box-shadow 150ms ease`.

---

### Requirement 12: Accesibilidad y Contraste en Componentes Unificados

**User Story:** Como usuario con necesidades de accesibilidad, quiero que todos los componentes interactivos tengan contraste suficiente y sean operables por teclado, para que pueda usar la aplicación independientemente de mis capacidades.

#### Acceptance Criteria

1. THE Button_System SHALL garantizar una relación de contraste mínima de 4.5:1 entre el texto del botón y su fondo en los estados normal y hover de todas las variantes; el estado `disabled` queda exento de este requisito de contraste según WCAG 1.4.3.
2. IF un botón es de tipo `btn--icon` (sin texto visible), THEN THE Button_System SHALL requerir que el elemento `<button>` tenga un atributo `aria-label` con una descripción de la acción en español.
3. WHEN `prefers-reduced-motion: reduce` está activo, THE Button_System SHALL aplicar `transition: none` y eliminar todas las propiedades `transform` y `box-shadow` en los estados `:hover` y `:active`, manteniendo únicamente las transiciones de `color`, `background-color` y `border-color` con duración máxima de `120ms`.
4. THE MC_Option SHALL ser un elemento `<button>` nativo y SHALL mostrar `outline: 2px solid var(--deep-sage)` con `outline-offset: 2px` cuando recibe foco mediante `:focus-visible`.
5. THE Team_Counter SHALL tener un atributo `aria-label` con el formato `"[Nombre del equipo]: [puntuación] puntos"`, y SHALL tener `aria-live="polite"` y `aria-atomic="true"` para que los lectores de pantalla anuncien los cambios de puntuación automáticamente.
6. IF un componente interactivo tiene un área táctil menor a 44×44px en dispositivos táctiles, THEN THE componente SHALL garantizar un área táctil mínima de 44×44px mediante `min-height: 44px` o `min-width: 44px` según corresponda.
