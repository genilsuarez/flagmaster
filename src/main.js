import { AppRouter } from './AppRouter.js';
import { GameSessionManager } from './controllers/GameSessionManager.js';
import { CountryService } from './services/CountryService.js';
import { StatsService } from './services/StatsService.js';
import { AchievementService } from './services/AchievementService.js';
import { GlobalDefaultsService } from './services/GlobalDefaultsService.js';
import { BottomSheetView } from './views/BottomSheetView.js';
import { GameEndModalView } from './views/GameEndModalView.js';
import { AchievementToast } from './views/AchievementToast.js';
import { AppMenu } from './views/AppMenu.js';
import { GAME_MODES } from './models/ModeDefinition.js';

/**
 * Application entry point.
 *
 * Uses AppRouter for screen navigation and GameSessionManager for game orchestration.
 * The flow is: Home → BottomSheet (config) → Game → (Results) → Home.
 */
document.addEventListener('DOMContentLoaded', () => {
    const countryService = new CountryService();
    const statsService = new StatsService();
    const achievementService = new AchievementService();
    const globalDefaults = new GlobalDefaultsService();

    const router = new AppRouter();

    // Game container is the .game-wrapper element
    const gameContainer = document.querySelector('.game-wrapper');

    // Bottom sheet for game configuration
    const bottomSheet = new BottomSheetView({
        countryService,
        globalDefaults,
        onPlay: (config) => startGame(config, router, sessionManager, countryService),
        onDismiss: () => {
            // Sheet closed without playing — no action needed
        },
    });

    // Session manager orchestrates all game modes
    const sessionManager = new GameSessionManager({
        container: gameContainer,
        countryService,
        statsService,
        achievementService,
        onSessionEnd: (results) => {
            handleSessionEnd(results, router, gameEndModal, bottomSheet);
            // Show achievement toast notifications
            if (results.newAchievements && results.newAchievements.length > 0) {
                achievementToast.show(results.newAchievements);
            }
        },
    });

    // Game end modal for showing results
    const gameEndModal = new GameEndModalView({
        onPlayAgain: (modeId) => handlePlayAgain(modeId, router, bottomSheet),
        onHome: () => router.reset('home'),
    });

    // Achievement toast for unlock notifications
    const achievementToast = new AchievementToast();

    // App menu (drawer) — "Jugar ahora" goes to home where mode cards are visible
    const appMenu = new AppMenu({
        statsService,
        onPlay: () => router.reset('home'),
        onOpenSettings: () => openSettingsModal(globalDefaults, countryService),
        onHome: () => {
            router.reset('home');
            appMenu.updateMotivationUI();
        },
    });

    // Listen for navigation events to manage view lifecycle
    document.addEventListener('app:navigate', (event) => {
        const { screen, params } = event.detail;

        switch (screen) {
            case 'home':
                appMenu.updateMotivationUI();
                break;

            case 'game':
                // Game screen is managed by GameSessionManager
                break;
        }
    });

    // Wait for country data to load, then render mode cards
    const waitForInit = setInterval(() => {
        if (countryService.countries && countryService.countries.length > 0) {
            clearInterval(waitForInit);

            // Render mode cards directly into the landing (clicking goes straight to game)
            renderModeCards(router, sessionManager, countryService, globalDefaults);

            // Wire settings button
            const settingsBtn = document.getElementById('landingSettingsBtn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', () => openSettingsModal(globalDefaults, countryService));
            }
        }
    }, 50);

    // Load country data
    countryService.loadCountries().catch(err => {
        console.error('Failed to load countries:', err);
    });
});

/**
 * Renders mode cards directly into the landing hero.
 * Clicking a card starts the game immediately using global defaults.
 */
function renderModeCards(router, sessionManager, countryService, globalDefaults) {
    const container = document.getElementById('modeCardsContainer');
    if (!container) return;

    const modes = Object.values(GAME_MODES);
    const teamModes = modes.filter(m => m.category === 'team');
    const individualModes = modes.filter(m => m.category === 'individual');

    const makeCard = (mode) => createModeCard(mode, router, sessionManager, countryService, globalDefaults);

    const teamLabel = document.createElement('h3');
    teamLabel.className = 'landing-modes__label';
    teamLabel.textContent = 'Modos en Equipo';
    container.appendChild(teamLabel);

    const teamGrid = document.createElement('div');
    teamGrid.className = 'landing-modes__grid';
    teamModes.forEach(mode => teamGrid.appendChild(makeCard(mode)));
    container.appendChild(teamGrid);

    const indLabel = document.createElement('h3');
    indLabel.className = 'landing-modes__label';
    indLabel.textContent = 'Modos Individuales';
    container.appendChild(indLabel);

    const indGrid = document.createElement('div');
    indGrid.className = 'landing-modes__grid';
    individualModes.forEach(mode => indGrid.appendChild(makeCard(mode)));
    container.appendChild(indGrid);
}

/**
 * Creates a single mode card button that starts the game directly.
 */
function createModeCard(mode, router, sessionManager, countryService, globalDefaults) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'landing-mode-card';
    btn.setAttribute('data-mode-id', mode.id);
    btn.setAttribute('aria-label', `${mode.name} — ${mode.category === 'team' ? 'Equipos' : 'Individual'}`);
    btn.innerHTML = `
        <span class="landing-mode-card__icon" aria-hidden="true">${mode.icon}</span>
        <span class="landing-mode-card__name">${mode.name}</span>
    `;
    btn.addEventListener('click', () => {
        const d = globalDefaults.get();
        startGame({
            modeId: mode.id,
            continent: d.continent,
            sovereigntyStatus: d.sovereigntyStatus,
            maxCount: d.maxCount,
            modeOptions: {},
            practiceMode: false,
            randomOrder: d.randomOrder,
        }, router, sessionManager, countryService);
    });
    return btn;
}

/**
 * Starts a game session with the given config from BottomSheetView.
 */
function startGame(config, router, sessionManager, countryService) {
    const { modeId, continent, sovereigntyStatus, maxCount, modeOptions, practiceMode, randomOrder } = config;

    // Filter the country pool
    let pool = countryService.filterCountries({
        continent,
        sovereigntyStatus,
        maxCount: undefined, // get all matching first
    });

    // Shuffle if random order (default)
    if (randomOrder !== false) {
        pool = [...pool];
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
    }

    // Apply max count limit
    if (maxCount && maxCount > 0 && maxCount < pool.length) {
        pool = pool.slice(0, maxCount);
    }

    if (pool.length === 0) {
        alert('No hay países que coincidan con los filtros seleccionados');
        return;
    }

    // Navigate to game screen
    router.navigate('game');

    // Update game header title to reflect the active mode
    const gameTitleEl = document.querySelector('.game-header h1');
    if (gameTitleEl) {
        const mode = GAME_MODES[modeId];
        gameTitleEl.textContent = mode ? `${mode.icon} ${mode.name}` : 'Quiz de Banderas';
    }

    // Start the session through GameSessionManager
    sessionManager.startSession(modeId, {
        modeOptions: modeOptions || {},
        continent,
        sovereignty: sovereigntyStatus,
        maxCount,
        practiceMode,
        randomOrder,
    }, pool);
}

/**
 * Handles session end: shows the game end modal with results.
 */
function handleSessionEnd(results, router, gameEndModal, bottomSheet) {
    const { modeId, totalScore, correct, wrong, maxStreak, elapsedSeconds, newAchievements, modeOptions, continent, sovereignty } = results;

    // Navigate back to home
    router.reset('home');

    // Determine if this was a team mode
    const teamModes = ['banderaFlash', 'capitalQuest'];
    if (teamModes.includes(modeId) && results.roundHistory) {
        // Team mode: show team scores
        const teamScores = {};
        // Build team scores from round history (simplified)
        teamScores.red = results.correct || 0;
        teamScores.blue = results.wrong || 0;
        teamScores.green = 0;

        gameEndModal.showTeamResults({
            modeId,
            teamScores,
            newAchievements: newAchievements || [],
            modeOptions: modeOptions || {},
            continent: continent || null,
            sovereignty: sovereignty || null,
        });
    } else {
        // Individual mode: show individual stats
        gameEndModal.showIndividualResults({
            modeId,
            totalScore: totalScore || 0,
            correct: correct || 0,
            wrong: wrong || 0,
            maxStreak: maxStreak || 0,
            elapsedSeconds: elapsedSeconds || 0,
            newAchievements: newAchievements || [],
            modeOptions: modeOptions || {},
            continent: continent || null,
            sovereignty: sovereignty || null,
        });
    }
}

/**
 * Handles "Play Again" from the game end modal.
 * Opens the BottomSheet for the same mode to allow quick replay.
 */
function handlePlayAgain(modeId, router, bottomSheet) {
    router.reset('home');
    // Open bottom sheet for the mode after a brief delay to let the home screen render
    setTimeout(() => {
        bottomSheet.open(modeId);
    }, 100);
}

// ─── Settings Modal ─────────────────────────────────────────────────────────

/**
 * Opens the global preferences modal.
 *
 * Governs the four shared defaults that apply to every game mode:
 *   - Continente        (continent filter)
 *   - Países incluidos  (sovereignty filter)
 *   - Cantidad máxima   (maxCount — null means "use all")
 *   - Orden aleatorio   (randomOrder)
 *
 * On save, writes to GlobalDefaultsService which persists to localStorage
 * under 'flagquiz_global_defaults'. The BottomSheetView reads these as the
 * starting point before applying per-mode overrides.
 *
 * @param {import('./services/GlobalDefaultsService.js').GlobalDefaultsService} globalDefaults
 * @param {import('./services/CountryService.js').CountryService} countryService
 */
function openSettingsModal(globalDefaults, countryService) {
    if (document.querySelector('.settings-modal-overlay')) return;

    const current = globalDefaults.get();
    const fd = globalDefaults.constructor.FACTORY_DEFAULTS;

    const continentOptions = [
        { value: 'All',     label: '🌍 Todos' },
        { value: 'Africa',  label: 'África' },
        { value: 'America', label: 'América' },
        { value: 'Asia',    label: 'Asia' },
        { value: 'Europe',  label: 'Europa' },
        { value: 'Oceania', label: 'Oceanía' },
    ];
    const sovereignOptions = [
        { value: 'All', label: '🌐 Todos' },
        { value: 'Yes', label: '🏳️ Soberanos' },
        { value: 'No',  label: '🏢 Territorios' },
    ];

    const makeChips = (options, activeValue, group) =>
        options.map(o => `<button type="button" class="settings-chip${o.value === activeValue ? ' is-selected' : ''}" data-group="${group}" data-value="${o.value}">${o.label}</button>`).join('');

    const overlay = document.createElement('div');
    overlay.className = 'settings-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'settingsModalTitle');
    overlay.innerHTML = `
        <div class="settings-modal">
            <div class="settings-modal__header">
                <div class="settings-modal__header-text">
                    <h2 id="settingsModalTitle" class="settings-modal__title">Ajustes de partida</h2>
                    <p class="settings-modal__subtitle">Valores base — cada modo puede ajustarse por separado</p>
                </div>
                <button class="settings-modal__close" aria-label="Cerrar" type="button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="settings-modal__body">
                <div class="settings-field">
                    <span class="settings-field__label">🌍 Continente</span>
                    <div class="settings-chips" role="group" aria-label="Continente">
                        ${makeChips(continentOptions, current.continent, 'continent')}
                    </div>
                </div>
                <div class="settings-field">
                    <span class="settings-field__label">🏳️ Países incluidos</span>
                    <div class="settings-chips" role="group" aria-label="Países incluidos">
                        ${makeChips(sovereignOptions, current.sovereigntyStatus, 'sovereigntyStatus')}
                    </div>
                </div>
                <label class="settings-toggle">
                    <span class="settings-toggle__label">
                        <span class="settings-toggle__label-text">🔀 Orden aleatorio</span>
                        <span class="settings-toggle__label-hint">Mezcla las banderas en cada partida</span>
                    </span>
                    <span class="settings-toggle__track">
                        <input id="sm-random" name="randomOrder" type="checkbox" class="settings-toggle__input"${current.randomOrder ? ' checked' : ''}>
                        <span class="settings-toggle__thumb" aria-hidden="true"></span>
                    </span>
                </label>
            </div>
            <div class="settings-modal__footer">
                <button class="settings-modal__cancel" type="button">Cancelar</button>
                <button class="settings-modal__save" type="button">Guardar ajustes</button>
            </div>
        </div>
    `;

    // Chip selection
    overlay.addEventListener('click', (e) => {
        const chip = e.target.closest('.settings-chip');
        if (!chip) return;
        const group = chip.dataset.group;
        overlay.querySelectorAll(`.settings-chip[data-group="${group}"]`).forEach(c => c.classList.remove('is-selected'));
        chip.classList.add('is-selected');
    });

    const modal = overlay.querySelector('.settings-modal');
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    modal.querySelector('.settings-modal__close').focus();

    const close = () => {
        overlay.classList.remove('is-open');
        overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    };

    overlay.querySelector('.settings-modal__close').addEventListener('click', close);
    overlay.querySelector('.settings-modal__cancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function onEsc(e) {
        if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
    });

    const saveBtn = overlay.querySelector('.settings-modal__save');
    saveBtn.addEventListener('click', () => {
        const chipVal = (group) => overlay.querySelector(`.settings-chip[data-group="${group}"].is-selected`)?.dataset.value;
        globalDefaults.set({
            continent:         chipVal('continent')         || fd.continent,
            sovereigntyStatus: chipVal('sovereigntyStatus') || fd.sovereigntyStatus,
            randomOrder:       modal.querySelector('[name="randomOrder"]').checked,
        });

        saveBtn.classList.add('is-saved');
        saveBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> ¡Guardado!`;
        setTimeout(close, 700);
    });
}
