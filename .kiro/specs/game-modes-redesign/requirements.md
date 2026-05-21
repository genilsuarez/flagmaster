# Requirements Document

## Introduction

Rediseño completo del sistema de modos de juego del Flag Quiz. Se separa la selección de modo de la parametrización en dos pantallas distintas, se renombran los modos existentes de equipo, se añaden 5 nuevos modos individuales con sistema de puntuación basado en velocidad, se implementa un sistema transversal de rachas y multiplicadores, un sistema de power-ups ganados por racha, y nuevos logros.

## Glossary

- **Mode_Selector**: Pantalla de selección de modo que muestra una cuadrícula visual de tarjetas con todos los modos disponibles
- **Parametrization_Screen**: Pantalla de configuración contextual que aparece tras seleccionar un modo, con opciones específicas del modo y filtros comunes de contenido
- **Streak_System**: Sistema transversal que rastrea respuestas correctas consecutivas y aplica multiplicadores de puntuación
- **Power_Up_System**: Sistema que otorga habilidades especiales al alcanzar umbrales de racha, almacenadas en inventario y activadas manualmente
- **Scoring_Engine**: Motor de cálculo de puntuación que combina puntos base, factor de velocidad y multiplicador de racha
- **Country_Pool**: Conjunto de países filtrados según los criterios de contenido seleccionados en la parametrización
- **Speed_Factor**: Ratio entre tiempo restante y tiempo total asignado a una pregunta (time_remaining / total_time)
- **Achievement_System**: Sistema que rastrea y desbloquea logros basados en hitos del jugador
- **Game_Session**: Instancia activa de una partida individual con su estado de puntuación, racha y power-ups
- **Bandera_Flash**: Modo de equipo (antes "Modo Banderas") donde se muestra una bandera y los equipos compiten por nombrar el país
- **Capital_Quest**: Modo de equipo (antes "Modo Capitales") donde se muestra un país y los equipos compiten por nombrar la capital
- **Letras_en_Caída**: Modo individual existente donde las letras se revelan una por una y el jugador escribe la respuesta
- **Flag_Rush**: Modo individual de opción múltiple donde se muestra una bandera y 4 opciones de países
- **Capital_Clash**: Modo individual de opción múltiple donde se muestra un país y 4 opciones de capitales (o inverso)
- **Streak_Blitz**: Modo individual cronometrado que mezcla banderas y capitales con multiplicadores de racha y power-ups
- **Geo_Puzzle**: Modo individual de pistas progresivas (continente → población → área → letra de capital → capital completa → bandera)
- **Supervivencia**: Modo individual con 3 vidas, dificultad progresiva y mezcla de todo tipo de preguntas

## Requirements

### Requirement 1: Mode Selector Screen

**User Story:** As a player, I want to see all available game modes in a visual card grid, so that I can quickly understand and choose the mode I want to play.

#### Acceptance Criteria

1. WHEN the player navigates to mode selection, THE Mode_Selector SHALL display a grid of mode cards showing icon, name, description (maximum 60 characters), and category badge for each of the 8 available modes
2. THE Mode_Selector SHALL categorize modes with a badge indicating "Equipos" for team modes (Bandera_Flash, Capital_Quest) and "Individual" for solo modes (Letras_en_Caída, Flag_Rush, Capital_Clash, Streak_Blitz, Geo_Puzzle, Supervivencia)
3. WHEN the player selects a mode card, THE Mode_Selector SHALL navigate to the Parametrization_Screen passing the selected mode identifier so that mode-specific options are displayed
4. THE Mode_Selector SHALL display the following modes with their respective icons: Bandera Flash 🏴, Capital Quest 🏛️, Letras en Caída ✏️, Flag Rush 🚩, Capital Clash ⚔️, Streak Blitz ⚡, Geo Puzzle 🧩, Supervivencia 💀
5. THE Mode_Selector SHALL support keyboard navigation between mode cards and provide accessible labels including mode name and category for screen readers

### Requirement 2: Parametrization Screen

**User Story:** As a player, I want to configure my game session with options relevant to my chosen mode, so that I can customize the experience before starting.

#### Acceptance Criteria

1. WHEN the Parametrization_Screen loads for a selected mode, THE Parametrization_Screen SHALL display Section 1 (Content Filters) with a continent selector (defaulting to "All"), a sovereignty filter (defaulting to "All"), and a country count input accepting values between 5 and the total number of countries matching the current filters
2. WHEN the Parametrization_Screen loads for a selected mode, THE Parametrization_Screen SHALL display Section 2 (Mode Options) with the mode-specific configuration: time per question for timed modes (Flag_Rush, Capital_Clash, Streak_Blitz, Supervivencia), hint display variant for Capital_Quest and Capital_Clash, and number of teams for team modes
3. WHILE a team mode (Bandera_Flash or Capital_Quest) is selected, THE Parametrization_Screen SHALL display Section 3 (Modifiers) with practice mode toggle and random order toggle
4. WHILE an individual mode is selected, THE Parametrization_Screen SHALL hide Section 3 (Modifiers)
5. WHEN the player changes a content filter value, THE Parametrization_Screen SHALL update the country count input maximum to reflect the number of countries matching the current filter combination
6. IF the Country_Pool resulting from the selected filters contains fewer than 5 countries, THEN THE Parametrization_Screen SHALL disable the confirmation action and display a message indicating that more countries are needed
7. WHEN the player activates the confirmation action, THE Parametrization_Screen SHALL start a Game_Session with the selected parameters applied to the Country_Pool

### Requirement 3: Mode Renaming

**User Story:** As a player, I want the existing team modes to have distinctive branded names, so that each mode feels like a unique experience.

#### Acceptance Criteria

1. THE Mode_Selector SHALL display the flags team mode as "Bandera Flash" with the 🏴 icon
2. THE Mode_Selector SHALL display the capitals team mode as "Capital Quest" with the 🏛️ icon
3. THE Mode_Selector SHALL display the word drop mode as "Letras en Caída" with the ✏️ icon
4. THE system SHALL use the branded names "Bandera Flash", "Capital Quest", and "Letras en Caída" in all user-facing surfaces where the mode name is referenced, including in-game headers, results screens, and statistics

### Requirement 4: Flag Rush Mode

**User Story:** As a solo player, I want a fast-paced multiple choice mode with flags, so that I can test my flag knowledge under time pressure.

#### Acceptance Criteria

1. WHEN a Flag_Rush round starts, THE Flag_Rush mode SHALL display a flag image and 4 text options of country names (one correct, three distractors) with a 10-second countdown timer visible to the player
2. IF the Country_Pool contains at least 3 other countries from the same continent as the correct answer, THEN THE Flag_Rush mode SHALL select all 3 distractors from that continent
3. IF the Country_Pool contains fewer than 3 other countries from the same continent as the correct answer, THEN THE Flag_Rush mode SHALL fill remaining distractor slots with countries selected randomly from other continents in the Country_Pool
4. WHEN the player selects the correct option, THE Scoring_Engine SHALL calculate points using the formula: 100 × Speed_Factor × streak_multiplier, where Speed_Factor equals time_remaining divided by 10
5. WHEN the player selects an incorrect option, THE Scoring_Engine SHALL award zero points for that round and display a visual indication of the correct answer for 1.5 seconds before advancing
6. WHEN the round timer expires without a selection, THE Flag_Rush mode SHALL mark the round as incorrect, display the correct answer for 1.5 seconds, and advance to the next question

### Requirement 5: Capital Clash Mode

**User Story:** As a solo player, I want a multiple choice mode for capitals, so that I can practice capital knowledge with immediate feedback.

#### Acceptance Criteria

1. WHEN a Capital_Clash round starts, THE Capital_Clash mode SHALL display a country name and 4 capital options (one correct, three distractors)
2. WHERE the inverse variant is selected in the Parametrization_Screen, THE Capital_Clash mode SHALL display a capital name and 4 country options (one correct, three distractors) instead of the default layout
3. THE Capital_Clash mode SHALL select distractors from the same continent as the correct answer when the Country_Pool contains at least 4 countries from that continent
4. WHEN the player selects the correct option, THE Scoring_Engine SHALL calculate points using the formula: base_pts × Speed_Factor × streak_multiplier
5. WHEN the player selects an incorrect option, THE Scoring_Engine SHALL award zero points for that round
6. WHEN the player selects an option, THE Capital_Clash mode SHALL display a visual indicator distinguishing correct from incorrect within 300 milliseconds of selection
7. WHEN the round timer of 15 seconds expires without a selection, THE Capital_Clash mode SHALL mark the round as incorrect and advance to the next question

### Requirement 6: Streak Blitz Mode

**User Story:** As a solo player, I want a timed mode that mixes flags and capitals with streak rewards, so that I can challenge myself with variety and momentum.

#### Acceptance Criteria

1. WHEN a Streak_Blitz session starts, THE Streak_Blitz mode SHALL present a 90-second timed session of multiple-choice questions (4 options each) mixing flag identification and capital identification from the Country_Pool
2. THE Streak_Blitz mode SHALL apply the Streak_System multipliers and the Power_Up_System during the session
3. WHEN the session timer reaches zero, THE Streak_Blitz mode SHALL end the session immediately (discarding any unanswered question) and display the final cumulative score
4. THE Streak_Blitz mode SHALL vary question types (flag-to-country, country-to-capital) such that no single type appears more than 3 times consecutively
5. WHEN the player selects the correct option, THE Scoring_Engine SHALL calculate points using the formula: base_pts × Speed_Factor × streak_multiplier, where Speed_Factor is calculated from a per-question timer of 10 seconds
6. WHEN the player selects an incorrect option, THE Streak_Blitz mode SHALL award zero points for that question, reset the streak, and immediately advance to the next question
7. WHEN the per-question timer expires without a selection, THE Streak_Blitz mode SHALL mark the question as incorrect, reset the streak, and advance to the next question

### Requirement 7: Geo Puzzle Mode

**User Story:** As a solo player, I want a progressive hints mode where fewer hints mean more points, so that I can test deep geographical knowledge.

#### Acceptance Criteria

1. WHEN a Geo_Puzzle round starts, THE Geo_Puzzle mode SHALL reveal the first hint (continent) and allow the player to request subsequent hints one at a time in the following fixed order: continent, population range, area range, first letter of capital, full capital name, flag image
2. WHEN the player requests the next hint, THE Geo_Puzzle mode SHALL reveal the next hint in the sequence and keep all previously revealed hints visible
3. WHEN the player submits a correct country name after N hints revealed, THE Scoring_Engine SHALL award points using the formula: base_pts × ((6 - N + 1) / 6) × streak_multiplier, where N is the number of hints revealed at the time of the correct answer
4. WHEN the player submits an incorrect guess, THE Geo_Puzzle mode SHALL indicate the answer is wrong, keep the current hints visible, and allow the player to request the next hint or submit another guess without ending the round
5. WHEN all 6 hints have been revealed and the player submits an incorrect guess, THE Geo_Puzzle mode SHALL reveal the correct country name and award zero points for that round
6. THE Geo_Puzzle mode SHALL allow the player to submit a guess as free text input after any hint is revealed, with a maximum of one guess attempt per revealed hint level

### Requirement 8: Supervivencia Mode

**User Story:** As a solo player, I want a survival mode with limited lives and increasing difficulty, so that I can test my endurance and overall geography knowledge.

#### Acceptance Criteria

1. WHEN a Supervivencia session starts, THE Supervivencia mode SHALL initialize the player with 3 lives and a starting answer timer of 15 seconds per question
2. WHEN the player answers incorrectly or the round timer expires without a selection, THE Supervivencia mode SHALL deduct one life from the player
3. WHEN the player answers correctly, THE Scoring_Engine SHALL calculate points using the formula: base_pts × Speed_Factor × streak_multiplier, and THE Supervivencia mode SHALL advance to the next round
4. WHEN the player has zero lives remaining, THE Supervivencia mode SHALL end the session and display final results including total rounds survived, total score, and highest streak achieved
5. THE Supervivencia mode SHALL increase difficulty in tiers: rounds 1–10 use a 15-second timer, rounds 11–20 use a 10-second timer, and rounds 21 onward use a 7-second timer, with distractors selected from the same continent as the correct answer starting at round 11
6. THE Supervivencia mode SHALL mix question types including flag identification (flag-to-country) and capital identification (country-to-capital) drawn from the Country_Pool, presenting 4 options per question

### Requirement 9: Streak and Multiplier System

**User Story:** As a solo player, I want my consecutive correct answers to reward me with score multipliers, so that I feel momentum and am incentivized to maintain accuracy.

#### Acceptance Criteria

1. WHEN a Game_Session starts in any individual mode, THE Streak_System SHALL initialize the streak counter to zero and the active multiplier to ×1.0 with no visual indicator
2. WHEN the player reaches 3 consecutive correct answers, THE Streak_System SHALL apply a ×1.5 multiplier and display a gold border visual indicator, maintaining this multiplier until the next streak threshold is reached or the streak resets
3. WHEN the player reaches 5 consecutive correct answers, THE Streak_System SHALL apply a ×2.0 multiplier and display a terracotta gradient with 🔥 indicator, maintaining this multiplier until the next streak threshold is reached or the streak resets
4. WHEN the player reaches 8 consecutive correct answers, THE Streak_System SHALL apply a ×3.0 multiplier and display an animated pulse visual effect, maintaining this multiplier until the next streak threshold is reached or the streak resets
5. WHEN the player reaches 12 or more consecutive correct answers, THE Streak_System SHALL apply a ×5.0 multiplier and display an aurora effect with ✨ indicator, maintaining this multiplier until the streak resets
6. WHEN the player answers incorrectly or a round timer expires without a selection, THE Streak_System SHALL reset the multiplier to ×1.0, reset the streak counter to zero, and remove any active streak visual indicator

### Requirement 10: Power-Up System

**User Story:** As a solo player, I want to earn power-ups through streaks that I can use strategically, so that I have tactical options during challenging questions.

#### Acceptance Criteria

1. WHEN the player reaches a 3-answer streak, THE Power_Up_System SHALL grant a 🕐 "Tiempo Extra" power-up that, when activated, adds 5 seconds to the active question's remaining timer
2. WHEN the player reaches a 5-answer streak, THE Power_Up_System SHALL grant a ✂️ "50/50" power-up that, when activated on a multiple choice question, removes 2 incorrect options from the displayed choices
3. WHEN the player reaches a 7-answer streak, THE Power_Up_System SHALL grant a ❄️ "Freeze" power-up that, when activated, stops the countdown timer for the active question allowing unlimited response time
4. WHEN the player reaches a 10-answer streak, THE Power_Up_System SHALL grant a 💎 "Doble Puntos" power-up that, when activated, doubles the final calculated points (base_pts × Speed_Factor × streak_multiplier × 2) for the next correct answer
5. IF the player inventory already contains 3 power-ups when a new power-up is earned, THEN THE Power_Up_System SHALL discard the newly earned power-up and display a notification indicating the inventory is full
6. WHEN the player activates a power-up during a question, THE Power_Up_System SHALL apply the power-up effect immediately and allow a maximum of 1 power-up activation per question
7. WHEN the player answers incorrectly, THE Power_Up_System SHALL retain all earned power-ups in the inventory (only the streak counter resets)
8. IF the player activates the ✂️ "50/50" power-up on a non-multiple-choice question (Geo_Puzzle or Letras_en_Caída), THEN THE Power_Up_System SHALL prevent activation and display a notification indicating the power-up is not applicable to the current question type

### Requirement 11: Scoring Formula

**User Story:** As a solo player, I want my score to reflect both accuracy and speed, so that faster correct answers are rewarded more.

#### Acceptance Criteria

1. THE Scoring_Engine SHALL calculate individual mode points using the formula: points = base_pts × Speed_Factor × streak_multiplier, where base_pts is 1000 points per question
2. THE Scoring_Engine SHALL calculate Speed_Factor as time_remaining divided by total_time for the current question, yielding a value in the range 0.0 to 1.0
3. WHEN the player answers correctly with zero time remaining, THE Scoring_Engine SHALL apply a Speed_Factor of zero, resulting in zero points for that answer
4. THE Scoring_Engine SHALL round the final calculated points to the nearest integer before adding them to the session total
5. WHEN the player answers incorrectly, THE Scoring_Engine SHALL award zero points and not apply the streak_multiplier for that question

### Requirement 12: New Achievements

**User Story:** As a player, I want new achievements that recognize mastery across the new game modes, so that I have long-term goals to pursue.

#### Acceptance Criteria

1. WHEN the player achieves a 20-answer streak in any individual mode, THE Achievement_System SHALL unlock the "Imparable" achievement and display a notification indicating the achievement name and description
2. WHEN the player answers 100% correctly in a session of 30 or more questions, THE Achievement_System SHALL unlock the "Erudito" achievement
3. WHEN the player maintains an average response time below 2 seconds across a full session of 10 or more questions, THE Achievement_System SHALL unlock the "Velocista" achievement
4. WHEN the player has completed at least one session in each of the 8 game modes (Bandera_Flash, Capital_Quest, Letras_en_Caída, Flag_Rush, Capital_Clash, Streak_Blitz, Geo_Puzzle, Supervivencia), THE Achievement_System SHALL unlock the "Cartógrafo" achievement, where completing a session means finishing all configured questions, the session timer reaching zero, or losing all lives depending on the mode
5. WHEN the player has used 50 power-ups cumulatively across all sessions, THE Achievement_System SHALL unlock the "Coleccionista" achievement
6. WHEN the player reaches round 50 in Supervivencia mode, THE Achievement_System SHALL unlock the "Superviviente" achievement
7. IF an achievement has already been unlocked, THEN THE Achievement_System SHALL not re-trigger the unlock notification or modify the existing achievement state
8. THE Achievement_System SHALL persist all achievement unlock states and cumulative progress across sessions
