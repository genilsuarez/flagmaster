# Tasks

- [x] Create foundational models: Create src/models/ModeDefinition.js with GAME_MODES registry containing 8 modes each with id, name, icon, category, description. Create src/models/GameSessionState.js class with runtime state (modeId, config, isActive, currentRound, totalScore, streak, multiplier, lives, powerUps max 3, activePowerUp, startTime, sessionTimer, roundHistory). Create src/models/PowerUp.js with POWER_UP_TYPES constant containing 4 types: timeExtra streak 3, fiftyFifty streak 5, freeze streak 7, doublePoints streak 10.
- [x] Implement ScoringEngine: Create src/services/ScoringEngine.js with static BASE_POINTS 1000, calculate(timeRemaining, totalTime, streakMultiplier, doubleActive) returning Math.round(1000 * (timeRemaining/totalTime) * streakMultiplier * (doubleActive ? 2 : 1)), and calculateGeoPuzzle(hintsRevealed, streakMultiplier) returning Math.round(1000 * ((6 - N + 1) / 6) * streakMultiplier).
- [x] Implement StreakService: Create src/services/StreakService.js with THRESHOLDS array (count 12 mult 5.0 tier aurora, count 8 mult 3.0 tier pulse, count 5 mult 2.0 tier fire, count 3 mult 1.5 tier gold), recordCorrect() incrementing count and updating tier/multiplier, recordIncorrect() and reset() resetting count to 0 multiplier to 1.0 tier to none.
- [x] Implement PowerUpService: Create src/services/PowerUpService.js with MAX_INVENTORY 3 and GRANTS at streak 3/5/7/10, checkGrant(streakCount) granting power-up if inventory not full, activate(powerUpId, questionType) with validation (50/50 blocked on non-MC) and 1-per-question limit, reset() clearing inventory.
- [x] Implement DistractorService: Create src/services/DistractorService.js with generateDistractors(correctCountry, pool, count, preferSameContinent) preferring same-continent countries falling back to random ensuring uniqueness, and shuffleOptions(correct, distractors) returning randomized array with correct answer included.
- [x] Extract AchievementService: Create src/services/AchievementService.js with 11 achievements (5 existing explorer sniper lightning conqueror persistent plus 6 new imparable erudito velocista cartografo coleccionista superviviente), check(sessionResult, cumulativeStats) method returning newly unlocked achievements, persistence to flagquiz_achievements_v2 localStorage key and migration from old stats format.
- [x] Create AppRouter: Create src/AppRouter.js managing screens (landing, modeSelector, parametrization, game) with navigate(screen, params) with body class management, and back-navigation support and screen transition logic.
- [x] Build ModeSelectorView: Create src/views/ModeSelectorView.js rendering 8 mode cards in CSS Grid (2 cols desktop 1 mobile), each card shows icon name description and category badge (Equipos/Individual), click handler and keyboard navigation (arrows + Enter) with ARIA listbox/option roles.
- [x] Build ParametrizationView: Create src/views/ParametrizationView.js with mode header (icon + name + description), Section 1 Content Filters (continent selector, sovereignty filter, country count input), Section 2 Mode Options (dynamic options based on mode), Section 3 Modifiers (practice mode and random order toggles for team modes only), back button, play button, dynamic country count max, and disable-when-pool-too-small logic.
- [x] Build shared MultipleChoiceView: Create src/views/MultipleChoiceView.js with render(options, onSelect) displaying 4 buttons in 2x2 grid, correct/incorrect feedback (sage/rust colors) with 300ms feedback delay, disableOptions(indices) for 50/50 power-up and disable() after selection.
- [x] Build shared TimerView: Create src/views/TimerView.js with linear progress bar using requestAnimationFrame, start(totalSeconds), addTime(seconds), freeze(), onExpired callback, aria-live announcements at 5s/3s, and sage-to-rust color transition.
- [x] Build StreakIndicatorView: Create src/views/StreakIndicatorView.js with update(tier, count, multiplier) method, CSS transitions between tiers (none/gold/fire/pulse/aurora) with @keyframes animations, prefers-reduced-motion support and aria-live announcements.
- [x] Build PowerUpInventoryView: Create src/views/PowerUpInventoryView.js showing up to 3 circular icon buttons, update(inventory) and onActivate(id) callback, tooltip on hover, disable after 1 activation per round, and aria-labels.
- [x] Implement FlagRushController: Create src/controllers/FlagRushController.js implementing IModeController interface, pick country from pool generate distractors (same continent preference) render flag + MultipleChoiceView + TimerView(10s), handle correct/incorrect/timeout with 1.5s feedback display, integrate ScoringEngine StreakService PowerUpService with configurable round count.
- [x] Implement CapitalClashController: Create src/controllers/CapitalClashController.js with default (country to 4 capitals) and inverse (capital to 4 countries) variants, generate same-continent distractors use TimerView(15s) show 300ms visual feedback, integrate ScoringEngine StreakService PowerUpService.
- [x] Implement StreakBlitzController: Create src/controllers/StreakBlitzController.js with 90s session timer + 10s per-question timer, random mix of flag/capital questions (max 3 consecutive same type), immediate advance on answer with full Streak/PowerUp integration.
- [x] Implement GeoPuzzleController: Create src/controllers/GeoPuzzleController.js with 6 progressive hints (continent population area capital letter capital flag), free text input with 1 guess per hint level, scoring by hints revealed with streak integration.
- [x] Implement SupervivenciaController: Create src/controllers/SupervivenciaController.js with 3 lives system, difficulty tiers (rounds 1-10 15s, 11-20 10s, 21+ 7s with same-continent distractors), mixed question types pool recycling Scoring/Streak/PowerUp integration.
- [x] Create GameSessionManager: Create src/controllers/GameSessionManager.js orchestrating mode controllers with shared services, startSession(modeId, config, pool) creating appropriate controller and initializing services, handleAnswer(correct, timeRemaining, totalTime) coordinating scoring streak and power-ups, activatePowerUp(id, type) and endSession() with stats recording.
- [x] Build GameEndModalView: Create src/views/GameEndModalView.js extracting modal logic from existing code, support team scores and individual stats layouts, show newly unlocked achievements with Jugar de nuevo and Inicio buttons.
- [x] Integrate team modes: Rename UI strings to Bandera Flash and Capital Quest in all user-facing surfaces, wire existing GameController through GameSessionManager pass parametrization config, route end-game through endSession() and remove old gameModeFilter dropdown.
- [x] Integrate Letras en Caida: Wire WordDropController through GameSessionManager pass config, integrate StreakService (correct increments incorrect resets), route end-game through endSession() and remove old Word Drop options from deprecated panel.
- [x] Update main.js and index.html: Add mode selector and parametrization HTML containers to index.html, remove old filter panel, replace direct controller instantiation with AppRouter + GameSessionManager in main.js, wire Landing CTA and drawer actions preserve settings persistence.
- [x] Add CSS for all new components: Mode selector grid and parametrization screen styles, multiple choice grid timer bar streak indicators (4 tiers) and power-up inventory styles, @keyframes animations prefers-reduced-motion overrides and responsive breakpoints, all using existing design system tokens.
- [x] Extend StatsService and wire AchievementService: Add per-mode stats tracking and recordIndividualGame() method to StatsService, wire achievement checks at session end with unlock notification toast UI, persist modesCompleted and powerUpsUsed counters update stats modal.
- [x] Final integration testing and cleanup: Verify full flow for all 8 modes including streak/power-up systems and achievement unlocks, verify team mode keyboard shortcuts responsive layout and keyboard accessibility, run build and remove dead code from old system.

## Task Dependency Graph

```json
{
  "waves": [
    [1],
    [2, 3, 4, 5, 6, 7],
    [8, 9, 10, 11, 12, 13],
    [14, 15, 16, 17, 18],
    [19, 20],
    [21, 22],
    [23, 24, 25],
    [26]
  ]
}
```
