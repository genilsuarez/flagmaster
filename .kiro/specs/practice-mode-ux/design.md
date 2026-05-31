# Design Document: Practice Mode UX Improvements

## Overview

Este documento describe el diseño técnico para mejorar la experiencia de usuario del Modo Práctica en FlagQuiz. Los cambios transforman el modo práctica de un hack sobre la infraestructura de equipos a una experiencia de estudio individual coherente, con UI dedicada, auto-evaluación, y persistencia local de progreso.

La implementación se realiza sin base de datos ni autenticación, usando exclusivamente `localStorage` para persistencia y la arquitectura existente (JavaScript vanilla, MVC, CSS custom properties).

### Decisiones de diseño clave

- **Sin nuevas dependencias**: todo se implementa con JavaScript vanilla y CSS custom properties existentes.
- **Backward-compatible**: el modo de equipo normal (sin práctica) no se modifica en absoluto.
- **localStorage como única persistencia**: el progreso se guarda localmente; si no está disponible, la app funciona sin persistencia.
- **Auto-evaluación opcional con timeout**: si el usuario no responde en 2s, se registra como "timeout" y se avanza — mantiene el flujo automático para quien quiera modo pasivo.
- **Reutilización del GameController**: se extiende el comportamiento existente de `isPracticeMode` en lugar de crear un controlador nuevo.

---

## Architecture

```
src/
├── controllers/
│   └── GameController.js          → Extender lógica de práctica (ocultar equipos, study timer, self-assessment)
├── services/
│   └── PracticeProgressService.js → NUEVO: gestión de localStorage para progreso de práctica
├── views/
│   ├── BottomSheetView.js         → Modificar sección de modifiers para práctica mejorada
│   ├── GameEndModalView.js        → Añadir layout de Practice_Summary
│   └── PracticeBadgeView.js       → NUEVO: badge "📝 Práctica" en el header
├── models/
│   └── GameState.js               → Añadir campo studyTime, extender roundHistory con selfAssessment
assets/styles/
└── styles.css                     → Añadir estilos para practice-badge, practice-assessment, practice-summary
```

### Flujo de datos actualizado

```
BottomSheet (config con practiceMode=true, studyTime=5)
    ↓
main.js → startGame(config) → router.navigate('game')
    ↓
GameSessionManager.startSession('banderaFlash', config, pool)
    ↓
GameController.startWithConfig(config, pool)
    ├── Oculta Team_Counters (display: none)
    ├── Muestra Practice_Badge en header
    ├── Muestra progreso "X / Y" en header
    ├── Inicia Study_Timer (countdown configurable)
    │       ↓ (countdown = 0 o clic/espacio)
    ├── Revela respuesta
    ├── Muestra botones Self_Assessment ("La sabía" / "No la sabía")
    │       ↓ (clic en botón o timeout 2s)
    ├── Registra selfAssessment en roundHistory
    ├── Avanza a siguiente bandera
    │       ↓ (pool agotado)
    └── onGameEnd → GameSessionManager.endSession()
            ↓
    handleSessionEnd() → GameEndModalView.showPracticeResults()
            ├── Muestra métricas de sesión (knew/didntKnow/timeout)
            ├── Muestra porcentaje de dominio
            ├── Muestra progreso global (localStorage)
            ├── Botón "Repetir las que no sabía"
            ├── Botón "Jugar de nuevo"
            └── Botón "Inicio"
```

---

## Components and Interfaces

### 1. PracticeProgressService (nuevo)

Servicio que gestiona la persistencia local del progreso de práctica.

```javascript
// src/services/PracticeProgressService.js

const STORAGE_KEY = 'flagquiz_practice_progress';

export class PracticeProgressService {
    constructor() {
        this._cache = null;
    }

    /**
     * Obtiene el registro completo de progreso.
     * @returns {Object<string, {knew: number, didntKnow: number, lastSeen: number}>}
     */
    getAll() {
        if (this._cache) return this._cache;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            this._cache = raw ? JSON.parse(raw) : {};
        } catch {
            this._cache = {};
        }
        return this._cache;
    }

    /**
     * Registra el resultado de una bandera en la sesión de práctica.
     * @param {string} countryCode - Código ISO del país
     * @param {'knew' | 'didntKnow' | 'timeout'} assessment
     */
    record(countryCode, assessment) {
        const data = this.getAll();
        if (!data[countryCode]) {
            data[countryCode] = { knew: 0, didntKnow: 0, lastSeen: 0 };
        }
        if (assessment === 'knew') {
            data[countryCode].knew++;
        } else {
            // timeout cuenta como didntKnow para progreso
            data[countryCode].didntKnow++;
        }
        data[countryCode].lastSeen = Date.now();
        this._save(data);
    }

    /**
     * Calcula cuántas banderas están "dominadas" (knew > didntKnow) de un pool dado.
     * @param {string[]} countryCodes - Códigos del pool actual
     * @returns {{mastered: number, total: number}}
     */
    getMasteryStats(countryCodes) {
        const data = this.getAll();
        let mastered = 0;
        for (const code of countryCodes) {
            const entry = data[code];
            if (entry && entry.knew > entry.didntKnow) {
                mastered++;
            }
        }
        return { mastered, total: countryCodes.length };
    }

    /**
     * Verifica si localStorage está disponible.
     * @returns {boolean}
     */
    isAvailable() {
        try {
            localStorage.setItem('__test__', '1');
            localStorage.removeItem('__test__');
            return true;
        } catch {
            return false;
        }
    }

    /** @private */
    _save(data) {
        try {
            this._cache = data;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {
            // Silently ignore quota errors
        }
    }
}
```

### 2. PracticeBadgeView (nuevo)

Componente ligero que renderiza el badge de práctica en el header.

```javascript
// src/views/PracticeBadgeView.js

export class PracticeBadgeView {
    constructor(container) {
        this.container = container;
        this.element = null;
    }

    render() {
        this.element = document.createElement('span');
        this.element.className = 'practice-badge';
        this.element.textContent = '📝 Práctica';
        this.element.setAttribute('aria-label', 'Modo práctica activo');
        this.container.appendChild(this.element);
        return this.element;
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
    }
}
```

### 3. GameController — Extensiones para práctica mejorada

Cambios en `src/controllers/GameController.js`:

**Nuevos campos en constructor (cuando `isPracticeMode`):**
```javascript
this.practiceRoundHistory = []; // {country, selfAssessment, revealedManually}
this.assessmentTimeout = null;
this.studyTime = config.studyTime || 5; // reemplaza practiceCountdownSeconds
```

**Método `startCountdown()` modificado:**
```javascript
startCountdown() {
    this.stopCountdown();
    let countdownSeconds = this.gameState.isPracticeMode
        ? this.studyTime  // Nuevo: usa studyTime configurable
        : this.defaultCountdownSeconds;
    // ... resto igual
}
```

**Nuevo flujo post-revelación en práctica:**
```javascript
// Después de revealCountryInfo() cuando isPracticeMode:
if (this.gameState.isPracticeMode) {
    this.showSelfAssessment(); // Muestra botones "La sabía" / "No la sabía"
    this.assessmentTimeout = setTimeout(() => {
        this.recordAssessment('timeout');
    }, 2000);
}
```

**Nuevo método `showSelfAssessment()`:**
```javascript
showSelfAssessment() {
    const container = document.createElement('div');
    container.className = 'practice-assessment';
    container.innerHTML = `
        <button type="button" class="btn btn--primary practice-btn--knew" aria-label="La sabía">✓ La sabía</button>
        <button type="button" class="btn btn--secondary practice-btn--didnt-know" aria-label="No la sabía">✗ No la sabía</button>
    `;
    container.querySelector('.practice-btn--knew').addEventListener('click', () => this.recordAssessment('knew'));
    container.querySelector('.practice-btn--didnt-know').addEventListener('click', () => this.recordAssessment('didntKnow'));
    // Insertar debajo de countryInfo/capitalInfo
    this.view.elements.countryInfo?.parentNode?.appendChild(container);
    this._assessmentContainer = container;
}
```

**Nuevo método `recordAssessment(assessment)`:**
```javascript
recordAssessment(assessment) {
    if (this.assessmentTimeout) {
        clearTimeout(this.assessmentTimeout);
        this.assessmentTimeout = null;
    }
    // Registrar en historial
    const currentCountry = this.gameService.getCurrentCountry(this.filteredCountries);
    this.practiceRoundHistory.push({
        country: currentCountry,
        selfAssessment: assessment,
    });
    // Limpiar UI de assessment
    if (this._assessmentContainer) {
        this._assessmentContainer.remove();
        this._assessmentContainer = null;
    }
    // Avanzar
    this.handleTeamScore('blue'); // Reutiliza lógica existente de avance
}
```

**Ocultar equipos al iniciar:**
```javascript
// En startWithConfig(), después de configurar gameState:
if (this.gameState.isPracticeMode) {
    const teamsContainer = document.getElementById('teamsContainer');
    if (teamsContainer) teamsContainer.style.display = 'none';
    this._renderPracticeBadge();
    this._renderPracticeProgress();
}
```

**Deshabilitar keyboard shortcuts de equipos:**
```javascript
handleKeyPress(event) {
    if (!this.gameState.isActive) return;

    // En práctica, deshabilitar teclas de equipo
    if (this.gameState.isPracticeMode) {
        if (['r', 'g', 'd'].includes(event.key.toLowerCase())) return;
        // Teclas de self-assessment
        if (event.key === '1' && this._assessmentContainer) {
            this.recordAssessment('knew'); return;
        }
        if (event.key === '2' && this._assessmentContainer) {
            this.recordAssessment('didntKnow'); return;
        }
    }
    // ... resto de la lógica existente
}
```

### 4. BottomSheetView — Modificaciones

**Sección de modifiers actualizada cuando `practiceMode` está activo:**

- Reemplazar "Delay auto-avance (s)" por "Tiempo de estudio (s)" con input numérico (min: 2, max: 15, default: 5)
- Añadir descripción debajo del toggle: "Estudio individual: la respuesta se revela automáticamente tras el tiempo de estudio. Sin equipos ni competencia."
- Mostrar indicador de progreso si `PracticeProgressService.isAvailable()`: "X banderas dominadas de Y"

**Cambio en `_buildConfig()`:**
```javascript
if (this.mode && this.mode.category === 'team') {
    config.practiceMode = this.practiceMode;
    config.studyTime = this.studyTime; // Nuevo: reemplaza practiceDelay
    config.randomOrder = this.randomOrder;
}
```

### 5. GameEndModalView — Practice_Summary

Nuevo método `showPracticeResults()`:

```javascript
showPracticeResults({ modeId, practiceHistory, progressStats, modeOptions, continent, sovereignty }) {
    // practiceHistory: [{country, selfAssessment}]
    const knew = practiceHistory.filter(r => r.selfAssessment === 'knew').length;
    const didntKnow = practiceHistory.filter(r => r.selfAssessment === 'didntKnow').length;
    const timeout = practiceHistory.filter(r => r.selfAssessment === 'timeout').length;
    const total = practiceHistory.length;
    const masteryPct = total > 0 ? Math.round((knew / total) * 100) : 0;

    // Renderizar modal con:
    // - Header: "📝 Práctica completada"
    // - Stats: banderas vistas, las sabía, no las sabía, sin responder, tiempo
    // - Dominio: XX% con color semáforo
    // - Progreso global (de progressStats)
    // - Botón "Repetir las que no sabía" (si hay didntKnow/timeout)
    // - Botón "Jugar de nuevo"
    // - Botón "Inicio"
}
```

### 6. CSS — Nuevos estilos

```css
/* Practice Badge */
.practice-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: var(--soft-sand);
    color: var(--deep-sage);
    border-radius: var(--radius-pill);
    padding: 2px 8px;
    font-size: var(--btn-fs-sm);
    font-weight: 600;
    white-space: nowrap;
}

/* Practice Assessment Buttons */
.practice-assessment {
    display: flex;
    gap: var(--space-sm);
    justify-content: center;
    margin-top: var(--space-md);
    animation: fadeIn 200ms ease;
}
.practice-assessment .btn {
    min-height: 44px;
    flex: 1;
    max-width: 180px;
}

/* Practice Progress in Header */
.practice-progress {
    font-size: var(--fs-body);
    color: var(--warm-white);
    opacity: 0.9;
    font-weight: 500;
}

/* Practice Summary in Game End Modal */
.practice-summary__mastery {
    font-size: 1.5rem;
    font-weight: 700;
    text-align: center;
    margin: var(--space-md) 0;
}
.practice-summary__mastery--high { color: var(--deep-sage); }
.practice-summary__mastery--medium { color: var(--terracotta); }
.practice-summary__mastery--low { color: var(--rust); }

.practice-summary__global {
    font-size: var(--fs-body-sm);
    color: var(--stone);
    text-align: center;
    margin-top: var(--space-sm);
    padding-top: var(--space-sm);
    border-top: 1px solid var(--soft-sand);
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
    .practice-assessment { animation: none; }
}
```

---

## Data Models

### GameState (extensión)

```javascript
// Campos añadidos a GameState:
this.studyTime = 5;        // Segundos de countdown antes de revelar (configurable 2-15)
```

### roundHistory entry (extensión para práctica)

```javascript
// Estructura extendida cuando isPracticeMode:
{
    country: Country,           // Referencia al país de la ronda
    selfAssessment: 'knew' | 'didntKnow' | 'timeout',
}
```

### localStorage: flagquiz_practice_progress

```javascript
// Estructura persistida:
{
    "ar": { knew: 5, didntKnow: 2, lastSeen: 1717200000000 },
    "br": { knew: 3, didntKnow: 0, lastSeen: 1717200000000 },
    // ...
}
```

### Config object (extensión de _buildConfig)

```javascript
// Campos añadidos al config cuando practiceMode=true:
{
    practiceMode: true,
    studyTime: 5,       // Reemplaza practiceDelay
    randomOrder: true,
    // practiceDelay se elimina
}
```

---

## Error Handling

### localStorage no disponible

Si `localStorage` lanza una excepción (modo privado en Safari, quota excedida), `PracticeProgressService.isAvailable()` retorna `false`. En ese caso:
- No se muestra el indicador de progreso en el Bottom_Sheet
- No se muestra la línea de progreso global en el Practice_Summary
- El resto de la funcionalidad (self-assessment, métricas de sesión) funciona normalmente usando solo el `roundHistory` en memoria

### Pool vacío para "Repetir las que no sabía"

Si el usuario marca todas como "La sabía", el botón "Repetir las que no sabía" se deshabilita con texto "¡Perfecto! Las sabías todas 🎉". Si el pool filtrado de `didntKnow`/`timeout` tiene menos de 5 banderas, se incluyen todas las disponibles sin aplicar el mínimo de 5 (ya que es repaso, no quiz competitivo).

### Timeout de assessment durante transición

Si el usuario presiona "Terminar" mientras los botones de assessment están visibles, el `assessmentTimeout` se limpia en `endGame()` y la ronda actual se registra como `timeout`.

### Migración de practiceDelay → studyTime

El campo `practiceDelay` en localStorage (configuraciones guardadas previamente) se migra automáticamente: si existe `practiceDelay` pero no `studyTime`, se usa `Math.max(practiceDelay * 2, 5)` como valor inicial de `studyTime` (ya que el delay anterior era 1-3s y el nuevo rango es 2-15s).

---

## Testing Strategy

### Unit Tests

1. **PracticeProgressService**: `record()` incrementa contadores correctamente, `getMasteryStats()` calcula dominio, `isAvailable()` detecta localStorage.
2. **GameController (práctica)**: `showSelfAssessment()` crea botones, `recordAssessment()` registra y avanza, keyboard shortcuts deshabilitados para equipos.
3. **BottomSheetView**: toggle de práctica oculta opciones de equipo, muestra campo studyTime, descripción visible.
4. **GameEndModalView**: `showPracticeResults()` calcula métricas correctamente, color de dominio correcto según porcentaje.

### Integration Tests

1. **Flujo completo**: activar práctica → jugar → assessment → fin → verificar resumen.
2. **Repetir las que no sabía**: verificar que el pool se filtra correctamente.
3. **Persistencia**: verificar que `localStorage` se actualiza tras cada sesión.

### Edge Cases

- localStorage lleno (quota exceeded) → funciona sin persistencia
- Pool de 5 banderas con todas marcadas "La sabía" → botón repetir deshabilitado
- Usuario presiona Escape durante assessment → sesión termina, ronda actual = timeout
- Navegador sin soporte de localStorage → `isAvailable()` retorna false

