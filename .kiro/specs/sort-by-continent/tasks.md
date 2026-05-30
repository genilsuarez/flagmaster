# Implementation Plan: Ordena por Continente

## Overview

Implementación del modo de juego "Ordena por Continente" siguiendo la arquitectura MVC existente. El jugador clasifica banderas o capitales en zonas de continente mediante drag-and-drop (escritorio) o tap-to-assign (móvil). Se integra con GameSessionManager, GAME_MODES, MODE_OPTIONS y el sistema de diseño Editorial Luxe.

## Tasks

- [x] 1. Registrar el modo en el sistema y configurar opciones
  - [x] 1.1 Agregar entrada "ordenaContinente" en GAME_MODES y MODE_OPTIONS
    - Añadir en `src/models/ModeDefinition.js` la entrada con id "ordenaContinente", name "Ordena por Continente", icon "🌍", category "individual", description "Clasifica banderas o capitales en su continente"
    - Añadir en `src/models/ModeOptions.js` el array de opciones: itemCount (number, default 12, min 6, max 24), continents (multiSelect con África/América/Asia/Europa/Oceanía, todos seleccionados por defecto), itemType (select: banderas/capitales), timerMode (select: off/on), timeLimit (number, default 120, min 30, max 300, condicional a timerMode=on)
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 1.2 Escribir tests unitarios para el registro del modo
    - Verificar que GAME_MODES.ordenaContinente existe con los campos correctos
    - Verificar que MODE_OPTIONS.ordenaContinente contiene las 5 opciones con defaults correctos
    - Verificar que timeLimit tiene _conditionalOn apuntando a timerMode=on
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Implementar SessionGenerator (función pura)
  - [x] 2.1 Crear `src/controllers/ordena-continente/SessionGenerator.js`
    - Implementar función `generateSession(pool, modeOptions)` que retorna `{ items[], zones[] }`
    - Filtrar pool por Sovereign_State === "Yes" y excluir países con Capital_Spanish vacía o "Desconocida" cuando itemType es "capitals"
    - Distribuir ítems equitativamente entre continentes seleccionados: floor(itemCount / numContinents) por continente, redistribuir módulo aleatoriamente
    - Si un continente tiene menos países soberanos que su cuota, tomar todos los disponibles y redistribuir faltantes
    - Generar objetos GameItem con id único, countryId, continent, flagUrl, capital, displayValue, displayType
    - Generar objetos Zone con id, continent, label (en español)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 2.2 Escribir property test: mínimo de continentes (Property 1)
    - **Property 1: Minimum continents validation**
    - Generar subsets de continentes con tamaño 0 y 1, verificar que generateSession lanza error o retorna indicador de invalidez
    - **Validates: Requirements 2.6**

  - [ ]* 2.3 Escribir property test: max items ajusta a países disponibles (Property 2)
    - **Property 2: Max items adjusts to available sovereign countries**
    - Generar selecciones aleatorias de continentes, verificar que el máximo permitido iguala el conteo de países soberanos disponibles
    - **Validates: Requirements 2.7**

  - [ ]* 2.4 Escribir property test: invariantes de distribución del pool (Property 3)
    - **Property 3: Pool distribution invariants**
    - Generar configs aleatorias (itemCount, continents), verificar: exactamente itemCount ítems, todos soberanos, sin duplicados, cada continente tiene al menos floor(itemCount/numContinents) ítems
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 3. Implementar EvaluationEngine (función pura)
  - [x] 3.1 Crear `src/controllers/ordena-continente/EvaluationEngine.js`
    - Implementar función `evaluate(assignments, items)` que retorna `{ results[], score, correct, incorrect }`
    - Comparar assignedZone con continent real de cada ítem
    - Calcular score como Math.round((correct / total) * 100)
    - Para ítems incorrectos, incluir correctZone en el resultado
    - _Requirements: 8.1, 8.3, 8.5_

  - [ ]* 3.2 Escribir property test: correctitud de evaluación (Property 7)
    - **Property 7: Evaluation correctness**
    - Generar asignaciones aleatorias (correctas e incorrectas), verificar que isCorrect es true sii assignedZone === continent real
    - **Validates: Requirements 8.1, 8.5**

  - [ ]* 3.3 Escribir property test: cálculo de score (Property 8)
    - **Property 8: Score calculation**
    - Generar pares (correct, total) aleatorios con 0 ≤ correct ≤ total y total > 0, verificar score === Math.round((correct/total)*100)
    - **Validates: Requirements 8.3**

- [x] 4. Checkpoint - Verificar funciones puras
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implementar OrdenaContinenteView
  - [x] 5.1 Crear `src/views/OrdenaContinenteView.js` con estructura DOM y estilos
    - Renderizar Panel_Ítems con role="list" y cuadrícula responsive (4 cols desktop, 3 tablet, 2 mobile)
    - Renderizar Zona_Continente por cada continente seleccionado con role="region" y aria-label
    - Renderizar contador "{pendientes} / {total}", botón "Verificar respuestas" (deshabilitado inicialmente), y barra de timer (si aplica)
    - Aplicar tokens Editorial Luxe: --font-display para títulos de zona, --font-body para etiquetas, shadow-soft/radius-md en ítems, shadow-medium/radius-lg en zonas, cream-bg para fondos
    - Implementar animaciones con --ease-gentle y duraciones --duration-quick a --duration-moderate
    - Respetar prefers-reduced-motion con duration: 0ms
    - Incluir región aria-live="polite" para anuncios de asignación y aria-live="assertive" para resultados
    - _Requirements: 4.1, 4.2, 4.5, 4.6, 4.7, 4.8, 9.1, 11.1, 11.2, 11.3, 11.4, 11.5, 12.1, 12.4, 12.5, 12.6_

  - [x] 5.2 Implementar métodos de actualización de estado en OrdenaContinenteView
    - `moveItemToZone(itemId, zoneId)`: anima ítem del panel a la zona, actualiza DOM
    - `moveItemToPanel(itemId)`: devuelve ítem al panel con animación
    - `updateCounter(pending, total)`: actualiza texto del contador
    - `setVerifyEnabled(enabled)`: habilita/deshabilita botón
    - `showResults(results)`: marca ítems como correcto (sage/verde) o incorrecto (rust/rojo), muestra continente correcto para incorrectos
    - `showSummary(summary)`: muestra resumen con correctos, incorrectos, porcentaje y tiempo mm:ss
    - `updateTimer(remaining, total)`: actualiza barra de progreso del timer
    - `destroy()`: limpia DOM y listeners
    - _Requirements: 4.3, 4.4, 4.5, 4.7, 4.8, 8.2, 8.4, 8.5, 9.1_

  - [ ]* 5.3 Escribir property test: ARIA roles consistency (Property 11)
    - **Property 11: ARIA roles consistency**
    - Generar estados aleatorios, verificar que Panel_Ítems tiene role="list", ítems tienen role="listitem", zonas tienen role="region" con aria-label conteniendo nombre del continente y conteo
    - **Validates: Requirements 12.1**

  - [ ]* 5.4 Escribir property test: Verify button tracks completion (Property 5)
    - **Property 5: Verify button tracks completion state**
    - Generar estados con distintas cantidades de ítems pendientes, verificar botón deshabilitado sii pendingItems > 0
    - **Validates: Requirements 4.7, 4.8**

- [ ] 6. Implementar handlers de interacción
  - [x] 6.1 Crear `src/controllers/ordena-continente/DragDropHandler.js`
    - Implementar drag-and-drop nativo del navegador para dispositivos con pointer fino
    - Mostrar ítem con opacidad reducida al iniciar drag, copia siguiendo cursor
    - Highlight de zona al dragover (cambio de borde/fondo), revert en 150ms al dragleave
    - Drop sobre zona válida → invocar onDrop(itemId, zoneId)
    - Drop fuera de zona → invocar onDragCancel(itemId) con transición de retorno ≤300ms
    - Soportar drag entre zonas (reasignación directa)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 7.3_

  - [x] 6.2 Crear `src/controllers/ordena-continente/TapToAssignHandler.js`
    - Implementar selección por tap para dispositivos con pointer grueso
    - Tap en ítem → seleccionar (borde visible + cambio de escala)
    - Tap en zona con ítem seleccionado → asignar y limpiar selección
    - Tap en otro ítem → cambiar selección
    - Tap en mismo ítem → deseleccionar
    - Tap fuera de panel y zonas → deseleccionar
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 6.3 Escribir tests unitarios para DragDropHandler y TapToAssignHandler
    - Verificar que DragDropHandler emite callbacks correctos en drag/drop
    - Verificar que TapToAssignHandler gestiona selección/deselección correctamente
    - _Requirements: 5.1, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4_

- [x] 7. Implementar OrdenaContinenteController
  - [x] 7.1 Crear `src/controllers/ordena-continente/OrdenaContinenteController.js`
    - Constructor recibe { container, onRoundEnd, onGameEnd }
    - Implementar `start(pool, modeOptions)`: detectar pointer type, instanciar SessionGenerator, crear View, instanciar handler apropiado (DragDrop o TapToAssign), iniciar timer si aplica
    - Implementar `_handleAssign(itemId, zoneId)`: actualizar SessionState, mover ítem en view, actualizar contador, habilitar botón si no quedan pendientes, mover foco a botón si 0 pendientes
    - Implementar `_handleUnassign(itemId)`: devolver a pendientes, actualizar view y contador, deshabilitar botón
    - Implementar `_handleReassign(itemId, newZoneId)`: mover entre zonas sin pasar por panel
    - Implementar `_handleVerify()`: invocar EvaluationEngine, congelar estado, mostrar resultados en view, invocar onGameEnd con datos de sesión
    - Implementar `_handleTimeout()`: cancelar drag activo, ejecutar evaluación con estado actual, marcar pendientes como incorrectos
    - Implementar `_startTimer(seconds)`: temporizador regresivo, pausar en visibilitychange hidden, reanudar en visible
    - Implementar `stop()` y `destroy()`: limpiar timer, handlers, view
    - Exponer `roundHistory` con resultado de la sesión
    - _Requirements: 10.1, 10.2, 10.3, 7.1, 7.2, 7.3, 7.4, 8.1, 8.6, 9.2, 9.3, 9.4_

  - [ ]* 7.2 Escribir property test: Assignment state consistency (Property 4)
    - **Property 4: Assignment state consistency**
    - Generar secuencias aleatorias de asignaciones, verificar que ítem se remueve de pendientes, se agrega a zona, contador = total - asignados, zonas renderizadas = continentes seleccionados
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5**

  - [ ]* 7.3 Escribir property test: Unassignment restores pending (Property 6)
    - **Property 6: Unassignment restores pending state**
    - Generar asignaciones y luego desasignar aleatoriamente, verificar que ítem vuelve a pendientes, se remueve de zona, contador incrementa en 1
    - **Validates: Requirements 7.1, 7.2**

  - [ ]* 7.4 Escribir property test: Evaluation locks interaction (Property 9)
    - **Property 9: Evaluation locks interaction**
    - Generar estados pre y post evaluación, verificar que antes se puede reasignar y después las operaciones son no-ops
    - **Validates: Requirements 7.4, 8.6**

  - [ ]* 7.5 Escribir property test: Timeout marks unclassified as incorrect (Property 10)
    - **Property 10: Timeout marks unclassified items as incorrect**
    - Generar estados parcialmente clasificados, simular timeout, verificar que ítems sin clasificar cuentan como incorrectos
    - **Validates: Requirements 9.2, 9.3**

- [x] 8. Checkpoint - Verificar controller y view
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implementar accesibilidad por teclado
  - [x] 9.1 Agregar navegación por teclado en OrdenaContinenteView
    - Tab/Shift+Tab para mover foco entre ítems y zonas
    - Enter/Space para seleccionar ítem o asignar a zona enfocada
    - Flechas direccionales para mover foco entre zonas
    - Al asignar con teclado, mover foco al siguiente ítem pendiente
    - Cuando no quedan ítems pendientes, mover foco al botón "Verificar respuestas"
    - _Requirements: 12.2, 12.3, 12.7_

  - [ ]* 9.2 Escribir property test: Aria-live announcements (Property 12)
    - **Property 12: Aria-live announcements on state changes**
    - Generar acciones de asignación/desasignación, verificar que la región aria-live se actualiza con mensaje identificando ítem y acción
    - **Validates: Requirements 12.4**

- [x] 10. Integrar con GameSessionManager
  - [x] 10.1 Registrar OrdenaContinenteController en GameSessionManager
    - Agregar case "ordenaContinente" en `createController()` instanciando OrdenaContinenteController con { container, onRoundEnd, onGameEnd }
    - Agregar case "ordenaContinente" en `startController()` invocando `this.activeController.start(pool, modeOptions)`
    - Agregar "ordenaContinente" al array `individualModes` en `prepareGameUI()`
    - _Requirements: 10.3, 10.5_

  - [ ]* 10.2 Escribir tests de integración para el ciclo completo
    - Verificar que GameSessionManager crea OrdenaContinenteController correctamente
    - Verificar ciclo: startSession → assign all → verify → onGameEnd con datos correctos
    - Verificar que endSession() invoca stop() y reporta resultados parciales
    - _Requirements: 10.1, 10.3, 10.5_

- [x] 11. Validación de configuración en BottomSheet
  - [x] 11.1 Implementar validación de mínimo 2 continentes y ajuste dinámico de max ítems
    - En el flujo de configuración (BottomSheet), deshabilitar inicio si menos de 2 continentes seleccionados
    - Ajustar dinámicamente el max del campo itemCount al total de países soberanos disponibles en los continentes seleccionados
    - Mostrar mensaje de error si menos de 2 continentes
    - _Requirements: 2.6, 2.7_

- [x] 12. Final checkpoint - Verificar integración completa
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- El proyecto usa Vanilla JS con Vite y vitest como test runner
- fast-check se usará para property-based tests (compatible con vitest)
- Los handlers de interacción se instancian condicionalmente según `window.matchMedia('(pointer: fine)')`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.2", "3.3"] },
    { "id": 3, "tasks": ["5.1", "6.1", "6.2"] },
    { "id": 4, "tasks": ["5.2", "5.3", "5.4", "6.3"] },
    { "id": 5, "tasks": ["7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3", "7.4", "7.5", "9.1"] },
    { "id": 7, "tasks": ["9.2", "10.1", "11.1"] },
    { "id": 8, "tasks": ["10.2"] }
  ]
}
```
