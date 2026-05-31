# Implementation Plan: Practice Mode UX Improvements

## Overview

Transformar el Modo Práctica de un hack sobre la infraestructura de equipos a una experiencia de estudio individual coherente. Los cambios incluyen: ocultar UI de equipos, añadir badge visual, tiempo de estudio configurable, auto-evaluación, resumen enriquecido, y persistencia local de progreso.

## Tasks

- [ ] 1. Crear PracticeProgressService
  - [ ] 1.1 Crear `src/services/PracticeProgressService.js` con la clase completa
    - Implementar `getAll()`: lee y parsea `localStorage` bajo clave `flagquiz_practice_progress`, retorna objeto con estructura `{[countryCode]: {knew, didntKnow, lastSeen}}`
    - Implementar `record(countryCode, assessment)`: incrementa `knew` o `didntKnow` según assessment ('knew' incrementa knew, 'didntKnow' y 'timeout' incrementan didntKnow), actualiza `lastSeen` con `Date.now()`
    - Implementar `getMasteryStats(countryCodes)`: retorna `{mastered, total}` donde mastered = países con `knew > didntKnow`
    - Implementar `isAvailable()`: test de escritura/lectura en localStorage, retorna boolean
    - Implementar `_save(data)`: serializa y guarda en localStorage con try/catch silencioso
    - Usar cache interno (`this._cache`) para evitar lecturas repetidas de localStorage
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 2. Crear PracticeBadgeView y estilos CSS
  - [ ] 2.1 Crear `src/views/PracticeBadgeView.js`
    - Implementar `render()`: crea `<span class="practice-badge">📝 Práctica</span>` con `aria-label="Modo práctica activo"`, lo inserta en el container proporcionado
    - Implementar `destroy()`: remueve el elemento del DOM
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 2.2 Añadir estilos CSS para práctica en `assets/styles/styles.css`
    - Añadir `.practice-badge`: `display: inline-flex`, `align-items: center`, `gap: 4px`, `background: var(--soft-sand)`, `color: var(--deep-sage)`, `border-radius: var(--radius-pill)`, `padding: 2px 8px`, `font-size: var(--btn-fs-sm)`, `font-weight: 600`, `white-space: nowrap`
    - Añadir `.practice-assessment`: `display: flex`, `gap: var(--space-sm)`, `justify-content: center`, `margin-top: var(--space-md)`, `animation: fadeIn 200ms ease`
    - Añadir `.practice-assessment .btn`: `min-height: 44px`, `flex: 1`, `max-width: 180px`
    - Añadir `.practice-progress`: `font-size: var(--fs-body)`, `color: var(--warm-white)`, `opacity: 0.9`, `font-weight: 500`
    - Añadir `.practice-summary__mastery`: `font-size: 1.5rem`, `font-weight: 700`, `text-align: center`, `margin: var(--space-md) 0`
    - Añadir variantes de color: `--high` (var(--deep-sage)), `--medium` (var(--terracotta)), `--low` (var(--rust))
    - Añadir `.practice-summary__global`: `font-size: var(--fs-body-sm)`, `color: var(--stone)`, `text-align: center`, `border-top: 1px solid var(--soft-sand)`
    - Añadir `@keyframes fadeIn` y `@media (prefers-reduced-motion: reduce)` que desactiva la animación
    - _Requirements: 3.1, 5.4, 6.2_

- [ ] 3. Modificar GameController para práctica mejorada
  - [ ] 3.1 Ocultar UI de equipos cuando `isPracticeMode` está activo
    - En `startWithConfig()`, cuando `config.practiceMode === true`: aplicar `display: none` a `teamsContainer`
    - Instanciar `PracticeBadgeView` y renderizar en el `game-header` (dentro de `.header-top`)
    - Crear elemento `.practice-progress` con texto "1 / {total}" e insertarlo en el header
    - Inicializar `this.practiceRoundHistory = []` y `this.studyTime = config.studyTime || 5`
    - _Requirements: 2.1, 2.2, 3.1, 3.2_

  - [ ] 3.2 Implementar Study Timer configurable
    - Modificar `startCountdown()`: cuando `isPracticeMode`, usar `this.studyTime` como countdown inicial en lugar de `this.practiceCountdownSeconds`
    - Eliminar la lógica actual de `practiceDelay` post-revelación (el setTimeout de auto-avance)
    - Tras revelar la respuesta en práctica, llamar a `this.showSelfAssessment()` en lugar de auto-avanzar
    - _Requirements: 4.1, 4.2, 4.5_

  - [ ] 3.3 Implementar Self-Assessment UI
    - Crear método `showSelfAssessment()`: genera div `.practice-assessment` con dos botones ("✓ La sabía" clase `btn btn--primary practice-btn--knew`, "✗ No la sabía" clase `btn btn--secondary practice-btn--didnt-know`)
    - Insertar el contenedor debajo de `countryInfo` o `capitalInfo` según el gameMode
    - Añadir event listeners a ambos botones que llaman a `recordAssessment('knew')` o `recordAssessment('didntKnow')`
    - Iniciar `this.assessmentTimeout = setTimeout(() => this.recordAssessment('timeout'), 2000)`
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 3.4 Implementar método `recordAssessment(assessment)`
    - Limpiar `this.assessmentTimeout` si existe
    - Obtener país actual via `this.gameService.getCurrentCountry(this.filteredCountries)`
    - Pushear `{country, selfAssessment: assessment}` a `this.practiceRoundHistory`
    - Remover `this._assessmentContainer` del DOM
    - Actualizar texto del `.practice-progress` con el nuevo conteo
    - Llamar a `this.handleTeamScore('blue')` para avanzar (reutiliza lógica existente)
    - _Requirements: 5.2, 5.3_

  - [ ] 3.5 Deshabilitar keyboard shortcuts de equipos en práctica
    - En `handleKeyPress()`: si `isPracticeMode`, ignorar teclas 'r', 'g', 'd' (return early)
    - Añadir: si `isPracticeMode` y `this._assessmentContainer` existe, tecla '1' → `recordAssessment('knew')`, tecla '2' → `recordAssessment('didntKnow')`
    - Mantener tecla 'S' (saltar) y Espacio (revelar) funcionales en práctica
    - _Requirements: 2.3, 5.5_

  - [ ] 3.6 Adaptar botón "Saltar" para práctica
    - En `skipCurrentFlag()`: si `isPracticeMode`, limpiar `assessmentTimeout`, registrar como 'timeout', y avanzar sin mostrar assessment
    - Actualizar el `.practice-progress` al saltar
    - _Requirements: 2.4_

  - [ ] 3.7 Limpiar estado de práctica en `endGame()` y `stop()`
    - Limpiar `this.assessmentTimeout` si existe
    - Remover `this._assessmentContainer` si existe
    - Destruir `PracticeBadgeView`
    - Pasar `this.practiceRoundHistory` al callback `onGameEnd` como campo adicional
    - _Requirements: (cleanup, robustez)_

- [ ] 4. Modificar BottomSheetView para práctica mejorada
  - [ ] 4.1 Actualizar `_createModifiersSection()` para nueva UX de práctica
    - Añadir descripción debajo del toggle "Modo práctica": crear `<p>` con texto "Estudio individual: la respuesta se revela automáticamente tras el tiempo de estudio. Sin equipos ni competencia." con clase `bottom-sheet__hint`
    - Reemplazar el selector "Delay auto-avance (s)" por input numérico "Tiempo de estudio (s)" con `min=2`, `max=15`, `default=5`, clase `bottom-sheet__control`
    - Añadir descripción auxiliar debajo del input: "Segundos para pensar antes de ver la respuesta"
    - Cuando `practiceMode` se activa, ocultar el toggle "Orden aleatorio" (no aplica en práctica, siempre random)
    - _Requirements: 1.2, 1.3, 4.1, 4.4_

  - [ ] 4.2 Añadir indicador de progreso en el Bottom_Sheet
    - Instanciar `PracticeProgressService` en el constructor del BottomSheetView (o recibirlo como dependencia)
    - Cuando `practiceMode` está activo y `PracticeProgressService.isAvailable()`, mostrar debajo del botón "Jugar" un texto: "X banderas dominadas de Y" usando `getMasteryStats()` con los countryCodes del pool actual
    - Si localStorage no disponible, no mostrar nada
    - _Requirements: 7.5_

  - [ ] 4.3 Actualizar `_buildConfig()` para nuevo campo `studyTime`
    - Reemplazar `config.practiceDelay = this.practiceDelay` por `config.studyTime = this.studyTime`
    - Eliminar referencia a `practiceDelay` en el config de salida
    - _Requirements: 4.1_

  - [ ] 4.4 Migrar configuraciones guardadas de `practiceDelay` a `studyTime`
    - En `_loadSavedConfig()`: si existe `config.practiceDelay` pero no `config.studyTime`, calcular `studyTime = Math.max(config.practiceDelay * 2, 5)` y usar ese valor
    - En `_saveConfig()`: guardar `studyTime` en lugar de `practiceDelay`
    - _Requirements: (migración backward-compatible)_

- [ ] 5. Añadir indicador de práctica en Landing_Mode_Cards
  - [ ] 5.1 Modificar `createModeCard()` en `src/main.js` para modos de equipo
    - Para modos con `category === 'team'`, añadir un `<span>` debajo del nombre con texto "Incluye modo práctica", clase `landing-mode-card__practice-hint`, `font-size: 0.6rem`, `color: var(--stone)`
    - Añadir estilo CSS `.landing-mode-card__practice-hint` en `styles.css`
    - _Requirements: 1.1_

- [ ] 6. Implementar Practice_Summary en GameEndModalView
  - [ ] 6.1 Crear método `showPracticeResults()` en `src/views/GameEndModalView.js`
    - Recibir parámetros: `{modeId, practiceHistory, elapsedSeconds, progressStats, modeOptions, continent, sovereignty}`
    - Calcular: `knew`, `didntKnow`, `timeout` counts desde `practiceHistory`
    - Calcular `masteryPct = Math.round((knew / total) * 100)`
    - Renderizar header con "📝 Práctica completada" y chips de opciones (reutilizar `#buildDifficultyParts()`)
    - Renderizar stats: "Banderas vistas: X", "✓ Las sabía: Y", "✗ No las sabía: Z", "⏱️ Sin responder: W", "Tiempo total: MM:SS"
    - Renderizar porcentaje de dominio con clase de color según umbral (≥70% high, ≥40% medium, <40% low)
    - Si `progressStats` disponible, renderizar "Progreso total: X/Y banderas dominadas"
    - _Requirements: 6.1, 6.2_

  - [ ] 6.2 Implementar botón "Repetir las que no sabía"
    - Crear botón `btn btn--secondary` con texto "Repetir las que no sabía"
    - Al hacer clic, invocar callback `onPlayAgain` con parámetro adicional `{repeatPool: countryCodes}` donde countryCodes son los países con assessment 'didntKnow' o 'timeout'
    - Si todas fueron 'knew', deshabilitar el botón con texto "¡Perfecto! Las sabías todas 🎉"
    - Mantener botones "Jugar de nuevo" e "Inicio" existentes
    - _Requirements: 6.3, 6.4, 6.5_

- [ ] 7. Integrar PracticeProgressService en el flujo de sesión
  - [ ] 7.1 Instanciar `PracticeProgressService` en `src/main.js`
    - Crear instancia global y pasarla al `GameSessionManager` y al `BottomSheetView`
    - _Requirements: 7.1_

  - [ ] 7.2 Registrar progreso al finalizar sesión de práctica
    - En `handleSessionEnd()` de `main.js`: si `results.practiceMode && results.practiceHistory`, iterar sobre `practiceHistory` y llamar a `practiceProgressService.record(country.code, selfAssessment)` para cada entrada
    - _Requirements: 7.2_

  - [ ] 7.3 Pasar `practiceHistory` desde GameController a GameSessionManager
    - En `GameController.endGame()` y `GameSessionManager.handleGameEnd()`: incluir `practiceHistory: this.practiceRoundHistory` en el objeto de datos pasado al callback
    - En `GameSessionManager.buildSessionResults()`: incluir `practiceHistory` en los resultados si existe
    - _Requirements: (integración de datos)_

  - [ ] 7.4 Implementar "Repetir las que no sabía" en `handlePlayAgain()`
    - En `main.js`, modificar `handlePlayAgain()`: si recibe `repeatPool` (array de countryCodes), abrir BottomSheet con el pool pre-filtrado
    - Añadir método en BottomSheetView para aceptar un pool forzado que sobreescriba los filtros
    - _Requirements: 6.3_

- [ ] 8. Verificación final
  - Ejecutar la aplicación y probar el flujo completo: Home → Bandera Flash → activar práctica → configurar studyTime → Jugar → assessment → fin → resumen → repetir
  - Verificar que el modo de equipo normal (sin práctica) no tiene regresiones
  - Verificar que localStorage se actualiza correctamente tras cada sesión
  - Verificar accesibilidad: badge tiene aria-label, botones tienen min-height 44px, keyboard shortcuts funcionan

## Notes

- El campo `practiceDelay` se depreca en favor de `studyTime`. La migración es automática en `_loadSavedConfig()`.
- El auto-avance con `handleTeamScore('blue')` se mantiene como mecanismo interno de avance, pero el contador de equipo azul está oculto visualmente.
- El `PracticeProgressService` usa un cache en memoria para evitar lecturas repetidas de localStorage durante una sesión.
- Los keyboard shortcuts '1' y '2' para assessment solo están activos cuando los botones de assessment son visibles.
- El botón "Repetir las que no sabía" no aplica el mínimo de 5 banderas del pool normal, ya que es un modo de repaso.

