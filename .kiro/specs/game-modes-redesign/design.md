# Technical Design Document

## Overview

This document describes the high-level and low-level technical design for the game-modes-redesign feature. The system evolves from a monolithic settings panel into a two-screen navigation flow (Mode Selector → Parametrization), adds 5 new individual game modes, and introduces transversal Streak, Power-Up, and Scoring systems.

## Architecture

### Current Architecture (Before)

```
main.js
├── GameController (team modes: flags/capitals)
│   ├── GameState (model)
│   ├── GameService (logic)
│   ├── GameView (DOM manipulation)
│   └── CountryService (data)
├── WordDropController (individual mode)
│   ├── WordDropService (logic)
│   └── WordDropView (DOM)
├── StatsService (persistence)
└── AppMenu (drawer + modals)
```

### Target Architecture (After)

```
main.js (AppRouter)
├── ModeSelector (new screen)
│   └── ModeSelectorView
├── ParametrizationScreen (new screen)
│   └── ParametrizationView
├── GameSessionManager (new orchestrator)
│   ├── ScoringEngine (new)
│   ├── StreakService (new)
│   └── PowerUpService (new)
├── Mode Controllers
│   ├── BanderaFlashController (renamed GameController)
│   ├── CapitalQuestController (renamed capitals logic)
│   ├── LetrasEnCaidaController (renamed WordDropController)
│   ├── FlagRushController (new)
│   ├── CapitalClashController (new)
│   ├── StreakBlitzController (new)
│   ├── GeoPuzzleController (new)
│   └── SupervivenciaController (new)
├── Shared Services
│   ├── CountryService (existing, unchanged)
│   ├── DistractorService (new)
│   ├── StatsService (extended)
│   └── AchievementService (extracted from StatsService)
├── Shared Views
│   ├── MultipleChoiceView (new, reusable)
│   ├── TimerView (new, reusable)
│   ├── StreakIndicatorView (new)
│   ├── PowerUpInventoryView (new)
│   └── GameEndModalView (refactored)
└── AppMenu (existing, updated)
```


## Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        AppRouter                              │
│  Manages screen transitions: Landing → ModeSelector →        │
│  Parametrization → GameSession → Results → Landing           │
└──────────────┬───────────────────────────────────────────────┘
               │
    ┌──────────┼──────────────────────────────┐
    ▼          ▼                              ▼
┌────────┐ ┌──────────────┐  ┌──────────────────────────────┐
│  Mode  │ │Parametrization│  │      GameSessionManager       │
│Selector│ │   Screen      │  │                                │
│        │ │               │  │  ┌────────────┐ ┌───────────┐ │
│ 8 cards│ │ Filters +     │  │  │ScoringEngine│ │StreakSvc  │ │
│ grid   │ │ Mode options  │  │  └────────────┘ └───────────┘ │
│        │ │ + [¡Jugar!]   │  │  ┌────────────┐               │
└────────┘ └──────────────┘  │  │PowerUpSvc   │               │
                              │  └────────────┘               │
                              │         │                      │
                              │    ┌────┴────┐                 │
                              │    ▼         ▼                 │
                              │ [ModeCtrl] [SharedViews]       │
                              └──────────────────────────────┘
```


## Components and Interfaces

### Core Interfaces

```javascript
// IModeController - interface all mode controllers implement
interface IModeController {
    start(countryPool, modeOptions): void;
    stop(): void;
    destroy(): void;
    onAnswer: (correct: boolean, timeRemaining: number, totalTime: number) => void;
    onSessionEnd: () => void;
}

// IGameSessionCallbacks - callbacks from GameSessionManager to views
interface IGameSessionCallbacks {
    onScoreUpdate(totalScore: number, roundPoints: number): void;
    onStreakUpdate(tier: string, count: number, multiplier: number): void;
    onPowerUpGranted(powerUpType: string): void;
    onPowerUpActivated(powerUpType: string, effect: object): void;
    onLifeLost(remainingLives: number): void;
    onAchievementUnlocked(achievementId: string): void;
}
```

### Component Responsibilities

| Component | Responsibility | Depends On |
|-----------|---------------|------------|
| AppRouter | Screen transitions, URL-less navigation state | — |
| ModeSelectorView | Render mode cards, handle selection | ModeDefinition |
| ParametrizationView | Render config UI, validate inputs | CountryService, ModeDefinition |
| GameSessionManager | Orchestrate mode + shared services | All services, mode controllers |
| ScoringEngine | Calculate points from time/streak/powerup | — (pure) |
| StreakService | Track consecutive answers, determine tier | — (pure) |
| PowerUpService | Grant, validate, activate power-ups | PowerUp model |
| DistractorService | Generate wrong options for MC questions | CountryService |
| AchievementService | Evaluate and persist achievement unlocks | StatsService |
| MultipleChoiceView | Render 4 options, handle selection feedback | — |
| TimerView | Countdown display with freeze/extend support | — |
| StreakIndicatorView | Visual streak tier feedback | — |
| PowerUpInventoryView | Display and activate power-ups | — |

## Data Models

### ModeDefinition (static registry)

```javascript
// src/models/ModeDefinition.js
export const GAME_MODES = {
    banderaFlash:  { id: 'banderaFlash',  name: 'Bandera Flash',   icon: '🏴', category: 'team',       description: 'Adivina el país por su bandera' },
    capitalQuest:  { id: 'capitalQuest',  name: 'Capital Quest',   icon: '🏛️', category: 'team',       description: 'Adivina la capital del país' },
    letrasEnCaida: { id: 'letrasEnCaida', name: 'Letras en Caída', icon: '✏️', category: 'individual', description: 'Adivina antes de que caigan todas' },
    flagRush:      { id: 'flagRush',      name: 'Flag Rush',       icon: '🚩', category: 'individual', description: 'Elige el país correcto a contrarreloj' },
    capitalClash:  { id: 'capitalClash',  name: 'Capital Clash',   icon: '⚔️', category: 'individual', description: 'Elige la capital correcta' },
    streakBlitz:   { id: 'streakBlitz',   name: 'Streak Blitz',    icon: '⚡', category: 'individual', description: 'Mezcla todo y encadena rachas' },
    geoPuzzle:     { id: 'geoPuzzle',     name: 'Geo Puzzle',      icon: '🧩', category: 'individual', description: 'Pistas progresivas, menos = más puntos' },
    supervivencia: { id: 'supervivencia', name: 'Supervivencia',   icon: '💀', category: 'individual', description: '3 vidas, dificultad creciente' },
};
```

### GameSessionState (runtime model)

```javascript
// src/models/GameSessionState.js
export class GameSessionState {
    constructor(modeId, config) {
        this.modeId = modeId;
        this.config = config;           // { continent, sovereignty, maxCount, modeOptions }
        this.isActive = false;
        this.currentRound = 0;
        this.totalScore = 0;
        this.streak = 0;
        this.multiplier = 1.0;
        this.lives = null;              // Only for Supervivencia
        this.powerUps = [];             // max 3
        this.activePowerUp = null;
        this.startTime = null;
        this.sessionTimer = null;       // For Streak Blitz (90s countdown)
        this.roundHistory = [];         // { correct, points, timeMs }
    }
}
```


### StreakState

```javascript
// Managed by StreakService
{
    count: 0,           // consecutive correct answers
    multiplier: 1.0,    // current active multiplier
    tier: 'none'        // 'none' | 'gold' | 'fire' | 'pulse' | 'aurora'
}
```

### PowerUp

```javascript
// src/models/PowerUp.js
export const POWER_UP_TYPES = {
    timeExtra:   { id: 'timeExtra',   icon: '🕐', name: 'Tiempo Extra',  streakRequired: 3,  applicableTo: 'all' },
    fiftyFifty:  { id: 'fiftyFifty',  icon: '✂️', name: '50/50',         streakRequired: 5,  applicableTo: 'multipleChoice' },
    freeze:      { id: 'freeze',      icon: '❄️', name: 'Congelar',      streakRequired: 7,  applicableTo: 'all' },
    doublePoints:{ id: 'doublePoints', icon: '💎', name: 'Doble Puntos', streakRequired: 10, applicableTo: 'all' },
};
```

## Key Services

### ScoringEngine

```javascript
// src/services/ScoringEngine.js
export class ScoringEngine {
    static BASE_POINTS = 1000;

    calculate(timeRemaining, totalTime, streakMultiplier, doubleActive = false) {
        const speedFactor = totalTime > 0 ? timeRemaining / totalTime : 0;
        let points = ScoringEngine.BASE_POINTS * speedFactor * streakMultiplier;
        if (doubleActive) points *= 2;
        return Math.round(points);
    }

    calculateGeoPuzzle(hintsRevealed, streakMultiplier) {
        const factor = (6 - hintsRevealed + 1) / 6;
        return Math.round(ScoringEngine.BASE_POINTS * factor * streakMultiplier);
    }
}
```


### StreakService

```javascript
// src/services/StreakService.js
export class StreakService {
    static THRESHOLDS = [
        { count: 12, multiplier: 5.0, tier: 'aurora' },
        { count: 8,  multiplier: 3.0, tier: 'pulse' },
        { count: 5,  multiplier: 2.0, tier: 'fire' },
        { count: 3,  multiplier: 1.5, tier: 'gold' },
    ];

    constructor() { this.reset(); }

    recordCorrect() {
        this.count++;
        this.updateTier();
        return { multiplier: this.multiplier, tier: this.tier, count: this.count };
    }

    recordIncorrect() {
        this.reset();
        return { multiplier: 1.0, tier: 'none', count: 0 };
    }

    reset() { this.count = 0; this.multiplier = 1.0; this.tier = 'none'; }

    updateTier() {
        for (const t of StreakService.THRESHOLDS) {
            if (this.count >= t.count) {
                this.multiplier = t.multiplier;
                this.tier = t.tier;
                return;
            }
        }
        this.multiplier = 1.0;
        this.tier = 'none';
    }
}
```

### PowerUpService

```javascript
// src/services/PowerUpService.js
export class PowerUpService {
    static MAX_INVENTORY = 3;
    static GRANTS = [
        { streak: 3,  type: 'timeExtra' },
        { streak: 5,  type: 'fiftyFifty' },
        { streak: 7,  type: 'freeze' },
        { streak: 10, type: 'doublePoints' },
    ];

    constructor() { this.inventory = []; this.lastGrantStreak = 0; }

    checkGrant(streakCount) {
        const grant = PowerUpService.GRANTS.find(g => g.streak === streakCount);
        if (!grant) return null;
        if (this.inventory.length >= PowerUpService.MAX_INVENTORY) return { full: true };
        this.inventory.push(grant.type);
        return { granted: grant.type };
    }

    activate(powerUpId, questionType) { /* validates and removes from inventory */ }
    reset() { this.inventory = []; this.lastGrantStreak = 0; }
}
```


### DistractorService

```javascript
// src/services/DistractorService.js
export class DistractorService {
    /**
     * Generates N distractors for a given correct country.
     * Prefers same-continent countries for higher difficulty.
     */
    generateDistractors(correctCountry, pool, count = 3, preferSameContinent = true) {
        const sameContinentPool = pool.filter(c =>
            c.continent === correctCountry.continent && c !== correctCountry
        );
        let distractors = [];
        if (preferSameContinent && sameContinentPool.length >= count) {
            distractors = this.pickRandom(sameContinentPool, count);
        } else {
            distractors = this.pickRandom(
                pool.filter(c => c !== correctCountry), count
            );
        }
        return distractors;
    }

    pickRandom(array, count) { /* Fisher-Yates partial shuffle */ }
}
```

### AchievementService (extracted)

```javascript
// src/services/AchievementService.js
export class AchievementService {
    static ACHIEVEMENTS = {
        explorer:      { id: 'explorer',      icon: '🌍', name: 'Explorador',    condition: 'totalCorrect >= 10' },
        sniper:        { id: 'sniper',        icon: '🎯', name: 'Francotirador', condition: '10 correct in one game' },
        lightning:     { id: 'lightning',      icon: '⚡', name: 'Rayo',          condition: 'game < 60s' },
        conqueror:     { id: 'conqueror',      icon: '🌎', name: 'Conquistador',  condition: 'full continent' },
        persistent:    { id: 'persistent',     icon: '🔥', name: 'Persistente',   condition: '7 day streak' },
        imparable:     { id: 'imparable',      icon: '💪', name: 'Imparable',     condition: '20 answer streak' },
        erudito:       { id: 'erudito',        icon: '🧠', name: 'Erudito',       condition: '100% in 30+ questions' },
        velocista:     { id: 'velocista',      icon: '🏎️', name: 'Velocista',     condition: 'avg < 2s in session' },
        cartografo:    { id: 'cartografo',     icon: '🗺️', name: 'Cartógrafo',    condition: 'all 8 modes played' },
        coleccionista: { id: 'coleccionista',  icon: '💎', name: 'Coleccionista', condition: '50 power-ups used' },
        superviviente: { id: 'superviviente',  icon: '💀', name: 'Superviviente', condition: 'round 50 survival' },
    };

    check(sessionResult, cumulativeStats) { /* returns newly unlocked achievements */ }
}
```


## Screen Flow & Navigation

```
[Landing Hero]
     │
     ▼ (CTA "Comenzar Juego")
[Mode Selector Screen]
     │
     ▼ (tap mode card)
[Parametrization Screen]
     │
     ▼ (tap "¡Jugar!")
[Game Session] ←── mode-specific controller + shared views
     │
     ▼ (game ends)
[Results Modal]
     │
     ▼ (close)
[Landing Hero]
```

### AppRouter (new)

Replaces the current `landing-mode` class toggle with a proper state machine:

```javascript
// src/AppRouter.js
export class AppRouter {
    static SCREENS = ['landing', 'modeSelector', 'parametrization', 'game'];

    constructor() { this.currentScreen = 'landing'; }

    navigate(screen, params = {}) {
        this.hideAll();
        this.currentScreen = screen;
        this.show(screen, params);
    }
}
```

## View Components

### ModeSelectorView

- Renders a CSS Grid (2 columns desktop, 1 column mobile) of mode cards
- Each card: `<button>` with `role="option"` inside a `role="listbox"` container
- Cards use the Editorial Luxe design: cream background, subtle shadow, Fraunces for mode name
- Category badge: small pill with "Equipos" (sage) or "Individual" (ocean)

### ParametrizationView

- Header: mode icon + name + short description
- Section 1 (Content): continent `<select>`, sovereignty `<select>`, country count `<input type="number">`
- Section 2 (Mode Options): dynamically rendered based on mode ID
- Section 3 (Modifiers): only visible for team modes
- Footer: "← Volver" link + "¡Jugar!" primary button
- Reuses existing filter styling from `.filter-panel`

### MultipleChoiceView (shared)

- Renders 4 option buttons in a 2×2 grid
- Handles selection animation (scale + color feedback)
- Supports disabled state (for 50/50 power-up removing 2 options)
- Correct: sage green highlight; Incorrect: rust highlight + correct shown

### TimerView (shared)

- Circular or linear progress indicator showing time remaining
- Supports freeze (paused state) and time-extra (animation on add)
- Uses CSS custom properties for dynamic width/color

### StreakIndicatorView

- Positioned at top of game area
- Displays current streak count + multiplier badge
- CSS transitions between tiers: none → gold border → terracotta gradient → pulse animation → aurora particles
- Respects `prefers-reduced-motion`


### PowerUpInventoryView

- Fixed position at bottom of game area
- Shows up to 3 power-up icons as clickable buttons
- Tap to activate before answering; disabled after answer submitted
- Tooltip on hover showing power-up name and effect

## File Structure (New/Modified)

```
src/
├── AppRouter.js                          (NEW)
├── main.js                               (MODIFIED - wire AppRouter)
├── models/
│   ├── Country.js                        (EXISTING - unchanged)
│   ├── GameState.js                      (EXISTING - kept for team modes)
│   ├── GameSessionState.js               (NEW)
│   ├── ModeDefinition.js                 (NEW)
│   └── PowerUp.js                        (NEW)
├── services/
│   ├── CountryService.js                 (EXISTING - unchanged)
│   ├── GameService.js                    (EXISTING - kept for team modes)
│   ├── WordDropService.js                (EXISTING - renamed internally)
│   ├── StatsService.js                   (MODIFIED - extended)
│   ├── AchievementService.js             (NEW - extracted)
│   ├── ScoringEngine.js                  (NEW)
│   ├── StreakService.js                   (NEW)
│   ├── PowerUpService.js                 (NEW)
│   └── DistractorService.js              (NEW)
├── controllers/
│   ├── GameController.js                 (EXISTING - renamed to BanderaFlashController)
│   ├── WordDropController.js             (EXISTING - renamed to LetrasEnCaidaController)
│   ├── FlagRushController.js             (NEW)
│   ├── CapitalClashController.js         (NEW)
│   ├── StreakBlitzController.js          (NEW)
│   ├── GeoPuzzleController.js            (NEW)
│   ├── SupervivenciaController.js        (NEW)
│   └── GameSessionManager.js             (NEW - orchestrator)
└── views/
    ├── AppMenu.js                        (EXISTING - updated)
    ├── GameView.js                       (EXISTING - kept for team modes)
    ├── WordDropView.js                   (EXISTING - kept)
    ├── ModeSelectorView.js               (NEW)
    ├── ParametrizationView.js            (NEW)
    ├── MultipleChoiceView.js             (NEW)
    ├── TimerView.js                      (NEW)
    ├── StreakIndicatorView.js            (NEW)
    ├── PowerUpInventoryView.js           (NEW)
    └── GameEndModalView.js               (NEW - refactored from inline)
```

## Integration Strategy

### Backward Compatibility

- Team modes (Bandera Flash, Capital Quest) retain their existing GameController logic internally
- The existing `GameState`, `GameService`, and `GameView` are preserved for team modes
- WordDropController is preserved as-is, just renamed and routed through the new flow
- Settings persistence (`localStorage`) keys remain compatible; new keys are added for new modes

### GameSessionManager (Orchestrator)

```javascript
// src/controllers/GameSessionManager.js
export class GameSessionManager {
    constructor(countryService, statsService, achievementService) {
        this.scoring = new ScoringEngine();
        this.streak = new StreakService();
        this.powerUps = new PowerUpService();
        // ...
    }

    startSession(modeId, config, countryPool) {
        this.session = new GameSessionState(modeId, config);
        this.session.isActive = true;
        const controller = this.createController(modeId);
        controller.start(countryPool, config.modeOptions);
    }

    handleAnswer(correct, timeRemaining, totalTime) {
        if (correct) {
            const streakResult = this.streak.recordCorrect();
            const points = this.scoring.calculate(
                timeRemaining, totalTime, streakResult.multiplier,
                this.session.activePowerUp === 'doublePoints'
            );
            this.session.totalScore += points;
            this.powerUps.checkGrant(streakResult.count);
        } else {
            this.streak.recordIncorrect();
        }
        // Notify views...
    }

    endSession() { /* finalize stats, check achievements, show results */ }
}
```


## CSS Architecture

### New CSS Sections

All new styles follow the Editorial Luxe design system defined in `DESIGN.md`:

```css
/* Mode Selector Grid */
.mode-selector { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-lg); }
.mode-card { background: var(--warm-white); border: 1px solid var(--warm-gray); border-radius: var(--radius-lg); padding: var(--space-xl); cursor: pointer; transition: transform var(--duration-moderate) var(--ease-gentle); }
.mode-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lifted); }
.mode-card__badge--team { background: var(--sage); }
.mode-card__badge--individual { background: var(--ocean); }

/* Streak Indicators */
.streak-indicator--gold { border-color: var(--warm-gold); }
.streak-indicator--fire { background: linear-gradient(135deg, var(--terracotta), var(--warm-gold)); }
.streak-indicator--pulse { animation: streak-pulse 1s var(--ease-spring) infinite; }
.streak-indicator--aurora { animation: streak-aurora 2s var(--ease-gentle) infinite; }

/* Power-Up Inventory */
.powerup-inventory { display: flex; gap: var(--space-sm); position: fixed; bottom: var(--space-xl); }
.powerup-btn { width: 48px; height: 48px; border-radius: 50%; border: 2px solid var(--warm-gray); }
.powerup-btn--active { border-color: var(--sage); box-shadow: var(--shadow-medium); }

/* Multiple Choice Grid */
.mc-options { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); }
.mc-option { padding: var(--space-lg); border-radius: var(--radius-md); border: 1.5px solid var(--warm-gray); font-family: 'Newsreader', serif; }
.mc-option--correct { border-color: var(--sage); background: rgba(122, 155, 127, 0.1); }
.mc-option--incorrect { border-color: var(--rust); background: rgba(168, 90, 69, 0.1); }
```

### Responsive Considerations

- Mode Selector: 2 columns on desktop, 1 column on mobile (< 767px)
- Multiple Choice: 2×2 grid on desktop, stacked (1 column) on mobile
- Power-Up inventory: horizontal on desktop, compact icons on mobile
- Timer: smaller on mobile, positioned inline rather than floating

## Persistence & Storage

### localStorage Keys

| Key | Purpose | Format |
|-----|---------|--------|
| `flagquiz_stats_v1` | Existing stats (extended) | JSON |
| `flagquiz_achievements_v2` | Achievement states + progress | JSON |
| `flagquiz_settings` | Filter/mode preferences | JSON |
| `flagquiz_powerups_used` | Cumulative power-up usage count | number |
| `flagquiz_modes_completed` | Set of mode IDs completed at least once | string[] |

### Migration

On first load after update, if `flagquiz_stats_v1` exists but `flagquiz_achievements_v2` does not, migrate existing achievement data from stats to the new key.

## Performance Considerations

- Mode controllers are lazy-loaded: only the selected mode's controller is instantiated
- Flag images continue using the existing `flagcdn.com` CDN with preconnect
- Streak animations use CSS transforms/opacity only (GPU-composited, no layout thrashing)
- Timer uses `requestAnimationFrame` for smooth countdown without interval drift
- Country pool filtering happens once at session start, not per-round


## Accessibility

- Mode cards: `role="listbox"` container with `role="option"` children, arrow key navigation
- Timer: `aria-live="polite"` region announcing time remaining at 5s and 3s
- Streak indicator: `aria-live="polite"` announcing multiplier changes
- Power-up buttons: `aria-label` with power-up name and effect description
- Multiple choice options: proper `<button>` elements with visible focus rings (sage outline)
- All animations respect `prefers-reduced-motion: reduce` — instant transitions, no particles

## Testing Strategy

- Unit tests for ScoringEngine, StreakService, PowerUpService, DistractorService (pure logic)
- Integration tests for GameSessionManager orchestration flow
- Manual testing for visual streak indicators and animations
- Accessibility audit with keyboard-only navigation through full flow

## Error Handling

| Scenario | Handling |
|----------|----------|
| Country pool too small (< 5) | Parametrization disables "¡Jugar!" button, shows warning message |
| Country pool < 4 for distractors | DistractorService falls back to cross-continent selection |
| localStorage quota exceeded | All storage operations wrapped in try/catch; app continues without persistence |
| Flag image fails to load | Show placeholder with country code text; `onerror` handler on `<img>` |
| Timer drift (tab backgrounded) | Use `Date.now()` delta on each rAF frame instead of fixed decrements |
| Power-up activation on incompatible mode | PowerUpService returns error; UI shows toast notification; power-up stays in inventory |
| Achievement migration fails | Catch parse errors; start fresh achievement state; existing stats preserved |

## Correctness Properties

### Property 1: Streak Invariant
Streak count always equals the number of consecutive correct answers since last reset. Multiplier always corresponds to the highest threshold ≤ streak count. A reset sets both to their initial values (0 and 1.0).

**Validates: Requirements 9.1, 9.6**

### Property 2: Score Non-Negativity
Total session score is always ≥ 0. Individual round scores are ≥ 0 for correct answers and exactly 0 for incorrect answers. The scoring formula cannot produce negative values.

**Validates: Requirements 11.1, 11.5**

### Property 3: Power-Up Inventory Bound
inventory.length never exceeds MAX_INVENTORY (3). When full, newly earned power-ups are discarded (not queued). Only 1 power-up can be activated per question.

**Validates: Requirements 10.5, 10.6**

### Property 4: Distractor Uniqueness
The 4 displayed options always contain exactly 1 correct answer and 3 distinct distractors. No distractor equals the correct answer. No two distractors are the same country.

**Validates: Requirements 4.2, 4.3, 5.3**

### Property 5: Timer Monotonicity
Timer value only decreases (or stays frozen when Freeze power-up is active). addTime is the only operation that increases it. Timer never goes below 0.

**Validates: Requirements 10.1, 10.3**

### Property 6: Achievement Idempotency
Once unlocked, an achievement cannot be re-locked or re-triggered. The unlock notification fires exactly once per achievement per lifetime.

**Validates: Requirements 12.7, 12.8**

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Bundle size increase with 5 new controllers | Slower initial load | Lazy-load mode controllers; only import on selection |
| Streak animations causing jank on low-end devices | Poor UX | Use only compositor-friendly properties; test on throttled CPU |
| Power-up state lost on page refresh mid-game | Player frustration | Game sessions are ephemeral by design; document this behavior |
| Distractor selection producing duplicate options | Broken UI | DistractorService validates uniqueness before returning |
| localStorage quota exceeded | Settings/stats lost | Wrap all storage ops in try/catch; degrade gracefully |
