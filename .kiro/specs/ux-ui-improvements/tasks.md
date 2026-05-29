# Implementation Plan: UX/UI Improvements — FlagQuiz

## Overview

Homologar y unificar la interfaz de usuario de FlagQuiz mediante un sistema de design tokens CSS, un Button System semántico de cinco variantes, componentes Chip, y estilos consistentes para todos los componentes interactivos. Los cambios se distribuyen entre `assets/styles/styles.css` y las vistas JS en `src/views/`.

## Tasks

- [x] 1. Instalar fast-check y configurar entorno de testing
  - Ejecutar `npm install --save-dev fast-check` para añadir la librería PBT
  - Verificar que `vitest` ya está configurado en `package.json` (devDependencies)
  - Crear el archivo `src/views/ux-ui-improvements.test.js` con los imports base de `fc` y `vitest`
  - _Requirements: ninguno (infraestructura de testing)_

- [x] 2. Añadir tokens de diseño de botones al `:root` de `styles.css`
  - [x] 2.1 Insertar bloque `/* BUTTON SYSTEM TOKENS */` en `assets/styles/styles.css` inmediatamente después de los tokens de tipografía (`--fs-*`)
    - Añadir `--btn-h-xs: 28px`, `--btn-h-sm: 32px`, `--btn-h-md: 36px`, `--btn-h-lg: 40px`, `--btn-h-xl: 44px`
    - Añadir `--btn-px-sm: 12px`, `--btn-px-md: 16px`, `--btn-px-lg: 24px`, `--btn-px-xl: 32px`
    - Añadir `--btn-fs-sm: 0.72rem`, `--btn-fs-md: 0.82rem`, `--btn-fs-lg: 0.9rem`
    - No modificar ningún token existente (`--cream-bg`, `--sage`, `--space-*`, etc.)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6_

  - [x]* 2.2 Escribir unit tests para verificar presencia y valores exactos de los tokens
    - Parsear `assets/styles/styles.css` con `fs.readFileSync` y verificar que cada token existe en `:root` con el valor exacto
    - Verificar los 5 tokens `--btn-h-*`, los 4 tokens `--btn-px-*` y los 3 tokens `--btn-fs-*`
    - _Requirements: 1.1, 1.2, 1.3_


- [x] 3. Implementar clase base `.btn` y las 5 variantes semánticas en `styles.css`
  - [x] 3.1 Añadir la clase base `.btn` en `assets/styles/styles.css` después del bloque de tokens de botón
    - Implementar `display: inline-flex`, `align-items: center`, `justify-content: center`, `gap: 6px`, `border-radius: var(--radius-pill)`, `font-family: var(--font-body)`, `font-weight: 600`, `letter-spacing: 0.03em`, `cursor: pointer`, `border: none`
    - Añadir `transition` para `background-color`, `color`, `border-color`, `transform`, `box-shadow` con `var(--duration-quick) var(--ease-gentle)`
    - Añadir regla `.btn:disabled { opacity: 0.45; cursor: not-allowed; pointer-events: none; }`
    - Añadir regla `.btn:focus-visible { outline: 2px solid var(--deep-sage); outline-offset: 2px; }`
    - Añadir bloque `@media (prefers-reduced-motion: reduce)` que limita `transition` a `background-color 120ms, color 120ms, border-color 120ms` y elimina `transform` y `box-shadow` en `:hover` y `:active`
    - _Requirements: 2.1, 2.7, 2.8, 12.3_

  - [x] 3.2 Añadir las 5 variantes semánticas `.btn--primary`, `.btn--secondary`, `.btn--ghost`, `.btn--destructive`, `.btn--icon`
    - `.btn--primary`: `height: var(--btn-h-lg)`, `padding: 0 var(--btn-px-lg)`, `background: var(--deep-sage)`, `color: var(--warm-white)`, `font-size: var(--btn-fs-lg)`; hover con `background: var(--deep-sage)` oscurecido y `transform: translateY(-1px)`
    - `.btn--secondary`: `height: var(--btn-h-md)`, `padding: 0 var(--btn-px-md)`, `background: transparent`, `color: var(--deep-sage)`, `border: 1.5px solid var(--deep-sage)`, `font-size: var(--btn-fs-md)`
    - `.btn--ghost`: `height: var(--btn-h-sm)`, `padding: 0 var(--btn-px-md)`, `background: transparent`, `color: var(--stone)`, `border: 1px solid transparent`, `font-size: var(--btn-fs-sm)`; hover con `background: var(--soft-sand)` y `border-color: var(--warm-gray)`
    - `.btn--destructive`: `height: var(--btn-h-sm)`, `padding: 0 var(--btn-px-md)`, `background: transparent`, `color: var(--rust)`, `border: 1px solid rgba(160, 75, 56, 0.4)`, `font-size: var(--btn-fs-sm)`; focus-visible con `outline-color: var(--rust)`
    - `.btn--icon`: `width: 32px`, `height: 32px`, `padding: 0`, `border-radius: 50%`, `background: var(--soft-sand)`, `color: var(--charcoal)`, `border: 1px solid var(--warm-gray)`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.9_

  - [x]* 2.3 Escribir unit tests para verificar propiedades CSS de cada variante de botón
    - Crear un documento JSDOM, inyectar el CSS parseado y verificar `getComputedStyle` para cada variante
    - Verificar `height`, `background-color`, `color`, `border` para `.btn--primary`, `.btn--secondary`, `.btn--ghost`, `.btn--destructive`, `.btn--icon`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x]* 2.4 Escribir property test — Property 1: disabled state consistente en todas las variantes
    - **Property 1: Disabled state es consistente en todas las variantes de botón**
    - **Validates: Requirements 2.7**
    - Para cualquier variante de botón con atributo `disabled`, verificar `opacity: 0.45` y `cursor: not-allowed`

  - [x]* 2.5 Escribir property test — Property 2: focus-visible outline consistente en variantes no-destructivas
    - **Property 2: Focus-visible outline es consistente en variantes no-destructivas**
    - **Validates: Requirements 2.8**
    - Para variantes no-destructivas, verificar `outline: 2px solid var(--deep-sage)`; para `.btn--destructive`, verificar `outline-color: var(--rust)`


- [x] 4. Implementar componente `.chip` y `.chip-group` en `styles.css`
  - [x] 4.1 Añadir estilos del componente Chip en `assets/styles/styles.css` después del Button System
    - Implementar `.chip`: `height: var(--btn-h-sm)`, `padding: 0 var(--btn-px-sm)`, `border-radius: var(--radius-pill)`, `font-size: var(--btn-fs-sm)`, `font-weight: 600`, `border: 1.5px solid var(--warm-gray)`, `background: var(--warm-white)`, `color: var(--stone)`, `cursor: pointer`, `display: inline-flex`, `align-items: center`, `white-space: nowrap`
    - Añadir `transition: background 120ms ease, border-color 120ms ease, color 120ms ease`
    - Implementar `.chip--selected`: `background: var(--soft-sand)`, `border-color: var(--deep-sage)`, `color: var(--deep-sage)`
    - Implementar `.chip:focus-visible`: `outline: 2px solid var(--deep-sage)`, `outline-offset: 2px`
    - Implementar `.chip--readonly`: `pointer-events: none`, `cursor: default`
    - Implementar `.chip-group`: `display: flex`, `flex-wrap: wrap`, `gap: var(--space-xs)`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 5.8_

  - [x]* 4.2 Escribir unit tests para verificar estilos del componente Chip
    - Verificar que `.chip` tiene `height` de 32px (valor de `--btn-h-sm`)
    - Verificar que `.chip--selected` aplica `border-color: var(--deep-sage)` y `color: var(--deep-sage)`
    - Verificar que `.chip--readonly` tiene `pointer-events: none`
    - _Requirements: 5.1, 5.2, 5.7_

- [x] 5. Compactar `Game_Header` en `styles.css`
  - [x] 5.1 Modificar `.game-header` en `assets/styles/styles.css`
    - Cambiar `padding` de `var(--space-lg) var(--space-xl)` a `var(--space-sm) var(--space-md)`
    - Añadir `@media (min-width: 768px) { .game-header { max-height: 52px; } }` y `@media (max-width: 767px) { .game-header { max-height: 44px; } }`
    - Mantener el gradiente `linear-gradient(135deg, var(--deep-sage) 0%, var(--sage) 100%)` y `border-bottom: 3px solid var(--terracotta)`
    - _Requirements: 3.1, 3.6, 9.1_

  - [x] 5.2 Modificar `.game-header h1` en `assets/styles/styles.css`
    - Cambiar `font-size` de `1.5rem` a `1.1rem`
    - Añadir `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`, `max-width: 200px`
    - _Requirements: 3.2_

  - [x] 5.3 Actualizar selectores de botones del header para usar clases `.btn` + variante
    - Añadir clases `.btn.btn--primary` a `#startButton` (mantener estilos existentes como overrides mínimos)
    - Añadir clases `.btn.btn--ghost` a `.game-btn--skip`
    - Añadir clases `.btn.btn--destructive` a `.game-btn--end`
    - Verificar que `.header-top` usa `display: flex; align-items: center` para alinear en una sola fila
    - _Requirements: 3.3, 3.4, 3.5, 2.2, 2.3, 2.4_

  - [x]* 5.4 Escribir unit tests para verificar estados del Game_Header
    - Renderizar el header en estado pre-juego: verificar que `#startButton` es visible y `.game-btn--skip`, `.game-btn--end` tienen atributo `hidden`
    - Renderizar el header en estado en-juego: verificar que `.game-btn--skip` y `.game-btn--end` son visibles y `#startButton` tiene atributo `hidden`
    - _Requirements: 3.4, 3.5_


- [x] 6. Compactar `Bottom_Sheet` en `styles.css`
  - [x] 6.1 Modificar el selector del Bottom_Sheet en `assets/styles/styles.css`
    - Añadir `max-height: 70vh` y `overflow-y: auto` al contenedor del Bottom_Sheet
    - Cambiar `padding` a `var(--space-sm) var(--space-md) var(--space-md)`
    - _Requirements: 4.1_

  - [x] 6.2 Añadir layout de dos columnas para filtros del Bottom_Sheet
    - Añadir regla `@media (min-width: 321px) { .bottom-sheet__filters-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm); } }`
    - Aplicar `height: var(--btn-h-sm)` a los elementos `select` e `input[type="number"]` dentro del Bottom_Sheet
    - _Requirements: 4.2, 4.3_

  - [x] 6.3 Actualizar botones del Bottom_Sheet para usar variantes `.btn`
    - Aplicar `.btn.btn--primary` con `width: 100%` al botón de jugar (`.bottom-sheet__play-btn`)
    - Aplicar `.btn.btn--ghost` con `width: 100%` al botón de restablecer (`.bottom-sheet__reset-btn`)
    - Aplicar `.btn.btn--icon` al botón de cierre (`.bottom-sheet__close-btn`) con `aria-label="Cerrar"`
    - _Requirements: 4.4, 4.5, 2.2, 2.5, 2.6_

  - [x]* 6.4 Escribir unit tests para verificar layout y estado del Bottom_Sheet
    - Verificar que el contenedor tiene `max-height: 70vh` y `overflow-y: auto`
    - Verificar que el botón de jugar tiene `width: 100%` y usa la variante `btn--primary`
    - Verificar que cuando el pool es menor a 5, el botón de jugar tiene atributo `disabled`
    - _Requirements: 4.1, 4.4, 4.6_

- [x] 7. Implementar `_renderChipGroup()` en `BottomSheetView.js`
  - [x] 7.1 Añadir el método `_renderChipGroup(opt, currentValue)` a `src/views/BottomSheetView.js`
    - Implementar la lógica de selección de valor por defecto: `const defaultValue = currentValue ?? opt.default ?? opt.options[0]?.value`
    - Crear el contenedor `.chip-group` con `role="group"` y `aria-label={opt.label}`
    - Para cada opción, crear un `<button type="button" class="chip">` con `data-value`, `aria-pressed` y texto de la etiqueta
    - Añadir listener de `click` que actualiza `this.modeOptions[opt.id]`, alterna `chip--selected` y actualiza `aria-pressed` en todos los chips del grupo
    - Añadir listener de `keydown` para `Enter` y `Space` que invoca `chip.click()` con `e.preventDefault()`
    - _Requirements: 5.3, 5.4, 5.8_

  - [x] 7.2 Integrar `_renderChipGroup()` en el método de renderizado de opciones del `BottomSheetView`
    - Añadir la condición `const useChips = opt.type === 'select' && opt.options.length >= 2 && opt.options.length <= 4`
    - Cuando `useChips` es `true`, llamar a `_renderChipGroup(opt, currentValue)` en lugar de crear un `<select>`
    - Cuando `useChips` es `false` (más de 4 opciones), mantener el `<select>` existente
    - _Requirements: 4.7, 5.5, 5.6_

  - [x]* 7.3 Escribir property test — Property 3: chips de selección son mutuamente excluyentes
    - **Property 3: Chips de selección son mutuamente excluyentes dentro de un grupo**
    - **Validates: Requirements 5.3**
    - Para cualquier grupo de N chips (2 ≤ N ≤ 4), al seleccionar el chip en índice i, exactamente ese chip tiene `chip--selected` y `aria-pressed="true"`

  - [x]* 7.4 Escribir property test — Property 4: chip del valor por defecto está seleccionado al abrir
    - **Property 4: El chip del valor por defecto está seleccionado al abrir el BottomSheet**
    - **Validates: Requirements 5.4**
    - Para cualquier opción con `opt.default`, el chip con `data-value === opt.default` tiene `chip--selected` y `aria-pressed="true"` al renderizar

  - [x]* 7.5 Escribir property test — Property 5: opciones con 2-4 valores se renderizan como chips
    - **Property 5: Opciones con 2-4 valores se renderizan como chips, no como select**
    - **Validates: Requirements 4.7**
    - Para `opt.options.length` entre 2 y 4, el resultado es un `.chip-group`; para más de 4, es un `<select>`


- [x] 8. Checkpoint — Verificar tokens, Button System y Chips
  - Ejecutar `npx vitest --run` y confirmar que todos los tests de las tareas 2–7 pasan
  - Verificar visualmente en el navegador que el Game_Header es más compacto y el Bottom_Sheet muestra chips en lugar de selects para opciones con 2-4 valores
  - Preguntar al usuario si hay ajustes antes de continuar con los componentes de juego

- [x] 9. Compactar `MC_Option` en `styles.css` y `MultipleChoiceView.js`
  - [x] 9.1 Modificar el selector `.mc-option` en `assets/styles/styles.css`
    - Cambiar `min-height` a `44px` (reducido de ~52px, mantiene mínimo táctil WCAG 2.5.5)
    - Establecer `font-size: 0.85rem`, `border-radius: var(--radius-md)`, `border: 2px solid var(--warm-gray)`
    - Añadir `@media (max-width: 767px) { .mc-option { min-height: 44px; } }` para dispositivos táctiles
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 9.2 Añadir clases de estado de feedback para MC_Option en `assets/styles/styles.css`
    - Implementar `.mc-option--correct`: `border-color: var(--deep-sage)`, `background: rgba(74, 122, 80, 0.12)`, `color: var(--deep-sage)`
    - Implementar `.mc-option--incorrect`: `border-color: var(--rust)`, `background: rgba(160, 75, 56, 0.12)`, `color: var(--rust)`
    - Implementar `.mc-option__icon`: `font-size: 1em`, `margin-left: 0.25em`
    - Añadir regla `:focus-visible` en `.mc-option`: `outline: 2px solid var(--deep-sage)`, `outline-offset: 2px`
    - _Requirements: 6.4, 6.5, 6.6, 12.4_

  - [x] 9.3 Actualizar `src/views/MultipleChoiceView.js` para aplicar clases de feedback y añadir icono
    - Al marcar una opción como correcta, añadir clase `mc-option--correct` y crear elemento `.mc-option__icon` con texto `✓`
    - Al marcar una opción como incorrecta, añadir clase `mc-option--incorrect` y crear elemento `.mc-option__icon` con texto `✗`; también marcar la opción correcta con `mc-option--correct`
    - Verificar que los botones `.mc-option` son elementos `<button>` nativos
    - _Requirements: 6.4, 6.5, 6.6, 12.4_

  - [x]* 9.4 Escribir property test — Property 6: selección correcta aplica feedback correcto
    - **Property 6: Selección correcta de MC_Option aplica estilos de feedback correcto**
    - **Validates: Requirements 6.4, 6.6**
    - Para cualquier índice correcto en un array de 4 opciones, al hacer click, el botón recibe `mc-option--correct` y contiene `.mc-option__icon` con `✓`

  - [x]* 9.5 Escribir property test — Property 7: selección incorrecta aplica feedback incorrecto
    - **Property 7: Selección incorrecta de MC_Option aplica estilos de feedback incorrecto**
    - **Validates: Requirements 6.5, 6.6**
    - Para cualquier índice incorrecto, al hacer click, el botón recibe `mc-option--incorrect` con `✗`, y la opción correcta recibe `mc-option--correct`


- [x] 10. Compactar `Team_Counter` en `styles.css` y añadir atributos ARIA en las vistas
  - [x] 10.1 Modificar `#redCounter, #blueCounter, #greenCounter` en `assets/styles/styles.css`
    - Cambiar `min-height` de `90px` a `72px` en desktop; añadir `@media (max-width: 767px) { #redCounter, #blueCounter, #greenCounter { min-height: 60px; } }`
    - Cambiar `font-size` del score (`span:last-child`) de `2.4rem` a `2rem`; añadir `@media (max-width: 767px) { ... span:last-child { font-size: 1.8rem; } }`
    - Actualizar `span:first-child` a `font-size: 0.6rem`, `font-weight: 800`, `text-transform: uppercase`, `letter-spacing: 0.1em`
    - Mantener `padding: var(--space-md) var(--space-sm)` y `border-radius: var(--radius-lg)`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 10.2 Actualizar estados `:hover` y `:active` de Team_Counter en `assets/styles/styles.css`
    - Cambiar `:hover` a `transform: translateY(-4px)`, `box-shadow: 0 8px 24px rgba(28, 25, 23, 0.15)`, `transition: transform 150ms ease, box-shadow 150ms ease`
    - Cambiar `:active` a `transform: translateY(-2px) scale(1.02)`
    - _Requirements: 7.5, 7.6_

  - [x] 10.3 Añadir atributos ARIA a los Team_Counter en la vista JS correspondiente
    - Localizar el archivo de vista que renderiza `#redCounter`, `#blueCounter`, `#greenCounter`
    - Añadir `counter.setAttribute('aria-label', \`${teamName}: ${score} puntos\`)` al renderizar y al actualizar la puntuación
    - Añadir `counter.setAttribute('aria-live', 'polite')` y `counter.setAttribute('aria-atomic', 'true')` al crear el elemento
    - _Requirements: 7.5, 12.5_

  - [x]* 10.4 Escribir property test — Property 13: Team counters tienen atributos ARIA correctos
    - **Property 13: Team counters tienen atributos ARIA correctos**
    - **Validates: Requirements 12.5**
    - Para cualquier nombre de equipo y puntuación, el elemento tiene `aria-live="polite"`, `aria-atomic="true"` y `aria-label` con formato `"[nombre]: [puntuación] puntos"`

- [x] 11. Unificar modales con estructura base `App_Modal`
  - [x] 11.1 Añadir estilos base de `App_Modal` en `assets/styles/styles.css`
    - Implementar `.app-modal__panel`: `max-width: 440px`, `border-radius: var(--radius-xl)`, `border: 1px solid var(--warm-gray)`, `box-shadow: var(--shadow-lifted)`
    - Implementar `.app-modal__header`: `padding: var(--space-md) var(--space-lg)`, `border-bottom: 1px solid var(--soft-sand)`, `display: flex`, `align-items: center`, `justify-content: space-between`
    - Implementar `.app-modal__title`: `font-family: var(--font-display)`, `font-size: 1.2rem`
    - Implementar `.app-modal__body`: `padding: var(--space-md) var(--space-lg)`, `overflow-y: auto`, `max-height: 85vh`
    - Implementar `.app-modal__footer`: `padding: var(--space-md) var(--space-lg)`, `display: flex`, `gap: var(--space-sm)`, `justify-content: flex-end`
    - Implementar `.app-modal__backdrop`: `position: fixed`, `inset: 0`, `background: rgba(28, 25, 23, 0.5)`, `backdrop-filter: blur(8px)`
    - _Requirements: 8.1, 8.2, 8.3, 8.6_

  - [x] 11.2 Actualizar `src/views/GameEndModalView.js` para usar estructura base `App_Modal`
    - Refactorizar el HTML generado para usar `.app-modal__panel`, `.app-modal__header`, `.app-modal__title`, `.app-modal__body`, `.app-modal__footer`
    - Sobreescribir `max-width: 400px` para el Game_End_Modal
    - Añadir botón de cierre `.btn.btn--icon.app-modal__close` con `aria-label="Cerrar"` en el header
    - Añadir botones `.btn.btn--primary` (Jugar de nuevo) y `.btn.btn--secondary` (Inicio) en el footer
    - Añadir listener en el backdrop (`data-close="true"`) para invocar `close()` al hacer click
    - _Requirements: 8.1, 8.4, 8.6_

  - [x] 11.3 Implementar gestión de foco y cierre con Escape en los modales
    - Al abrir cualquier modal, guardar `document.activeElement` como `_triggerElement` y mover el foco al primer elemento interactivo del panel
    - Al cerrar, restaurar el foco a `_triggerElement`
    - Añadir listener `keydown` en el documento que invoca `close()` cuando `e.key === 'Escape'` y el modal está abierto
    - Para `Game_End_Modal`, Escape invoca el callback `onHome`
    - _Requirements: 8.7, 8.8_

  - [x]* 11.4 Escribir unit tests para verificar estructura base de los modales
    - Verificar que `GameEndModalView` genera `.app-modal__panel`, `.app-modal__header`, `.app-modal__body`, `.app-modal__footer`
    - Verificar que el botón de cierre tiene clase `btn--icon` y atributo `aria-label`
    - Verificar que `max-width` del Game_End_Modal es `400px`
    - _Requirements: 8.1, 8.2, 8.4_

  - [x]* 11.5 Escribir property test — Property 8: cerrar modal con Escape restaura el foco
    - **Property 8: Cerrar modal con Escape restaura el foco al elemento disparador**
    - **Validates: Requirements 8.7**
    - Para cualquier modal abierto, al presionar Escape, el modal se cierra y `document.activeElement` es el elemento que tenía el foco antes de abrir

  - [x]* 11.6 Escribir property test — Property 9: abrir modal mueve el foco al primer elemento interactivo
    - **Property 9: Abrir un modal mueve el foco al primer elemento interactivo**
    - **Validates: Requirements 8.8**
    - Para cualquier modal, inmediatamente después de abrirse, `document.activeElement` es el primer elemento interactivo dentro del panel

  - [x]* 11.7 Escribir property test — Property 10: click en backdrop cierra el modal
    - **Property 10: Click en backdrop cierra el modal**
    - **Validates: Requirements 8.6**
    - Para cualquier modal abierto, hacer click en `.app-modal__backdrop[data-close="true"]` invoca el método `close()`


- [x] 12. Checkpoint — Verificar componentes de juego y modales
  - Ejecutar `npx vitest --run` y confirmar que todos los tests de las tareas 9–11 pasan
  - Verificar visualmente que MC_Option, Team_Counter y modales tienen la estructura y estilos correctos
  - Preguntar al usuario si hay ajustes antes de continuar con el área de juego y encabezados de modo

- [x] 13. Compactar área de juego: `Timer_Bar`, `Round_Progress`, `Streak_Indicator`, `Power_Up_Button`
  - [x] 13.1 Modificar `Timer_Bar` y `Round_Progress` en `assets/styles/styles.css`
    - Cambiar `height` de `6px` a `4px` en los selectores de barra de progreso de tiempo y rondas
    - Añadir `margin: var(--space-xs) 0` a ambas barras
    - _Requirements: 9.2, 9.3_

  - [x] 13.2 Modificar `Streak_Indicator` en `assets/styles/styles.css`
    - Cambiar `min-height` de `40px` a `32px`
    - Cambiar `padding` a `var(--space-xs) var(--space-md)`
    - _Requirements: 9.4_

  - [x] 13.3 Modificar `Power_Up_Button` en `assets/styles/styles.css`
    - Cambiar `width` y `height` a `36px` en desktop (`min-width: 768px`)
    - Añadir `@media (max-width: 767px) { .power-up-btn { width: 32px; height: 32px; } }`
    - _Requirements: 9.5_

  - [x]* 13.4 Escribir unit tests para verificar dimensiones del área de juego
    - Verificar que `Timer_Bar` tiene `height: 4px`
    - Verificar que `Streak_Indicator` tiene `min-height: 32px`
    - Verificar que `Power_Up_Button` tiene `width: 36px` en desktop y `32px` en mobile
    - _Requirements: 9.2, 9.3, 9.4, 9.5_

- [x] 14. Unificar encabezados de modo de juego en `styles.css`
  - [x] 14.1 Actualizar todos los selectores de encabezado de modo en `assets/styles/styles.css`
    - Aplicar `padding: var(--space-xs) var(--space-sm)` a `.flag-rush-header`, `.capital-clash-header`, `.streak-blitz-header`, `.supervivencia-header`, `.geo-puzzle-header`
    - Aplicar `border-radius: var(--radius-md)` a todos los encabezados de modo
    - _Requirements: 10.1, 10.2_

  - [x] 14.2 Unificar tipografía de puntuación y progreso en encabezados de modo
    - Aplicar `font-family: var(--font-display)`, `font-size: var(--fs-score)` (1.5rem), `font-weight: 600` a los elementos de puntuación en todos los modos
    - Aplicar `font-family: var(--font-body)`, `font-size: var(--fs-body)` (0.9rem), `color: var(--stone)` a los elementos de progreso/rondas en todos los modos
    - Aplicar `font-size: 1rem`, `letter-spacing: 1px` a los indicadores de vidas (corazones) en StreakBlitz, Supervivencia y WordDrop
    - _Requirements: 10.3, 10.4, 10.5_

  - [x]* 14.3 Escribir property test — Property 11: encabezados de modo tienen tipografía consistente
    - **Property 11: Encabezados de modo de juego tienen tipografía consistente**
    - **Validates: Requirements 10.3, 10.4**
    - Para cualquier selector de encabezado de modo, el elemento de puntuación usa `font-family: var(--font-display)` y el de progreso usa `color: var(--stone)`


- [x] 15. Actualizar `Landing_Mode_Card` y `Mode_Card` en `styles.css` y `ModeCardView.js`
  - [x] 15.1 Añadir/actualizar estilos de `Landing_Mode_Card` en `assets/styles/styles.css`
    - Implementar `.landing-mode-card`: `padding: 8px var(--space-sm)`, `border-radius: var(--radius-md)`, `border: 1.5px solid var(--soft-sand)`, `gap: 2px`
    - Implementar `.landing-mode-card__icon`: `font-size: 1.2rem`
    - Implementar `.landing-mode-card__name`: `font-size: 0.72rem`, `font-weight: 600`, `color: var(--charcoal)`
    - Añadir `.landing-mode-card:active { transform: scale(0.97); transition: transform 150ms ease; }`
    - Añadir `.landing-mode-card:focus-visible { outline: 2px solid var(--deep-sage); outline-offset: 2px; }`
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 15.2 Añadir/actualizar estilos de `Mode_Card` en `assets/styles/styles.css`
    - Actualizar `.mode-card`: `padding: var(--space-lg)`, `border-radius: var(--radius-lg)`, `gap: var(--space-sm)`, `box-shadow: var(--shadow-soft)`
    - Implementar `.mode-card__badge--team`: `background: var(--sage)`, `color: var(--warm-white)`
    - Implementar `.mode-card__badge--individual`: `background: var(--ocean)`, `color: var(--warm-white)`
    - Implementar `.mode-card__badge`: `font-size: 0.6rem`, `padding: 2px var(--space-xs)`
    - Añadir `.mode-card:focus-visible { outline: 3px solid var(--deep-sage); outline-offset: 2px; }`
    - Añadir `.mode-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lifted); transition: transform 150ms ease, box-shadow 150ms ease; }`
    - _Requirements: 11.5, 11.6, 11.7, 11.8_

  - [x] 15.3 Actualizar `src/views/ModeCardView.js` para aplicar clases de badge por categoría
    - Al renderizar una Mode_Card de categoría Equipos, añadir clase `mode-card__badge--team` al badge
    - Al renderizar una Mode_Card de categoría Individual, añadir clase `mode-card__badge--individual` al badge
    - _Requirements: 11.6_

  - [x]* 15.4 Escribir unit tests para verificar estilos de Mode_Card y Landing_Mode_Card
    - Verificar que el badge de una Mode_Card de equipos tiene clase `mode-card__badge--team`
    - Verificar que el badge de una Mode_Card individual tiene clase `mode-card__badge--individual`
    - _Requirements: 11.6_

- [x] 16. Añadir soporte `prefers-reduced-motion` global en `styles.css`
  - [x] 16.1 Añadir bloque `@media (prefers-reduced-motion: reduce)` global en `assets/styles/styles.css`
    - Dentro del bloque, aplicar `transition: none` a `.landing-mode-card`, `.mode-card`, `.chip`, `.mc-option`, `#redCounter`, `#blueCounter`, `#greenCounter`
    - Eliminar `transform` y `box-shadow` en los estados `:hover` y `:active` de todos los componentes interactivos dentro del bloque
    - Mantener únicamente transiciones de `color`, `background-color` y `border-color` con duración máxima de `120ms` donde sea necesario
    - _Requirements: 12.3_

  - [x]* 16.2 Escribir property test — Property 14: reduced motion elimina animaciones de transform y box-shadow
    - **Property 14: Reduced motion elimina animaciones de transform y box-shadow**
    - **Validates: Requirements 12.3**
    - Para cualquier variante de botón, chip o tarjeta interactiva, dentro del bloque `@media (prefers-reduced-motion: reduce)`, los estados `:hover` y `:active` no contienen `transform` ni `box-shadow`

  - [x]* 16.3 Escribir property test — Property 12: botones icon-only tienen aria-label
    - **Property 12: Botones icon-only tienen aria-label**
    - **Validates: Requirements 12.2**
    - Para cualquier elemento con clase `btn--icon` en el DOM, tiene un atributo `aria-label` no vacío

  - [x]* 16.4 Escribir property test — Property 15: componentes interactivos tienen área táctil mínima de 44px
    - **Property 15: Componentes interactivos tienen área táctil mínima de 44px**
    - **Validates: Requirements 6.3, 12.6**
    - Para cualquier componente interactivo (botones, chips, mode cards, MC options), el valor de `min-height` en el CSS es al menos 44px en dispositivos táctiles

- [x] 17. Checkpoint final — Verificar todos los tests y la integración completa
  - Ejecutar `npx vitest --run` y confirmar que todos los tests pasan (unit tests + property tests)
  - Verificar que no hay regresiones en los tests existentes (`src/views/*.test.js`, `src/AppRouter.test.js`)
  - Preguntar al usuario si hay ajustes finales antes de cerrar el spec


## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad completa
- Los checkpoints en las tareas 8, 12 y 17 garantizan validación incremental
- Los property tests usan `fast-check` con `{ numRuns: 100 }` mínimo por propiedad
- Los unit tests usan JSDOM (ya disponible en devDependencies) para parsear CSS y verificar DOM
- Los tokens existentes (`--cream-bg`, `--sage`, `--space-*`, etc.) no se modifican en ninguna tarea
- El tag de cada property test debe incluir `// Feature: ux-ui-improvements, Property N: [texto]`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1", "3.2", "2.2"] },
    { "id": 3, "tasks": ["4.1", "5.1", "5.2", "2.3", "2.4", "2.5"] },
    { "id": 4, "tasks": ["4.2", "5.3", "6.1", "6.2", "6.3", "9.1", "9.2"] },
    { "id": 5, "tasks": ["5.4", "6.4", "7.1", "10.1", "10.2", "11.1", "13.1", "13.2", "13.3", "14.1", "14.2", "15.1", "15.2"] },
    { "id": 6, "tasks": ["7.2", "7.3", "7.4", "7.5", "9.3", "9.4", "9.5", "10.3", "11.2", "11.3", "13.4", "14.3", "15.3", "16.1"] },
    { "id": 7, "tasks": ["10.4", "11.4", "11.5", "11.6", "11.7", "15.4", "16.2", "16.3", "16.4"] }
  ]
}
```
