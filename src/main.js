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

    // App menu (drawer)
    const appMenu = new AppMenu({
        statsService,
        onPlay: () => bottomSheet.open(null),
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

            // Render mode cards directly into the landing
            renderModeCards(bottomSheet);

            // Wire settings button to open settings modal
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
 * Clicking a card opens the BottomSheet for that mode.
 */
function renderModeCards(bottomSheet) {
    const container = document.getElementById('modeCardsContainer');
    if (!container) return;

    const modes = Object.values(GAME_MODES);
    const teamModes = modes.filter(m => m.category === 'team');
    const individualModes = modes.filter(m => m.category === 'individual');

    // Team section
    const teamLabel = document.createElement('h3');
    teamLabel.className = 'landing-modes__label';
    teamLabel.textContent = 'Modos en Equipo';
    container.appendChild(teamLabel);

    const teamGrid = document.createElement('div');
    teamGrid.className = 'landing-modes__grid';
    teamModes.forEach(mode => teamGrid.appendChild(createModeCard(mode, bottomSheet)));
    container.appendChild(teamGrid);

    // Individual section
    const indLabel = document.createElement('h3');
    indLabel.className = 'landing-modes__label';
    indLabel.textContent = 'Modos Individuales';
    container.appendChild(indLabel);

    const indGrid = document.createElement('div');
    indGrid.className = 'landing-modes__grid';
    individualModes.forEach(mode => indGrid.appendChild(createModeCard(mode, bottomSheet)));
    container.appendChild(indGrid);
}

/**
 * Creates a single mode card button.
 */
function createModeCard(mode, bottomSheet) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'landing-mode-card';
    btn.setAttribute('data-mode-id', mode.id);
    btn.setAttribute('aria-label', `${mode.name} — ${mode.category === 'team' ? 'Equipos' : 'Individual'}`);
    btn.innerHTML = `
        <span class="landing-mode-card__icon" aria-hidden="true">${mode.icon}</span>
        <span class="landing-mode-card__name">${mode.name}</span>
    `;
    btn.addEventListener('click', () => bottomSheet.open(mode.id));
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

    const overlay = document.createElement('div');
    overlay.className = 'settings-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'settingsModalTitle');
    overlay.innerHTML = `
        <div class="settings-modal">
            <div class="settings-modal__header">
                <h2 id="settingsModalTitle" class="settings-modal__title">Preferencias</h2>
                <button class="settings-modal__close" aria-label="Cerrar" type="button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="settings-modal__body">
                <p class="settings-modal__hint">
                    Preferencias globales: se aplican como base en todos los modos.
                    Si ajustas los filtros dentro de un modo, esos valores locales tienen prioridad sobre los globales y se recuerdan por separado.
                </p>

                <div class="settings-field">
                    <label class="settings-field__label" for="sm-continent">Continente</label>
                    <select id="sm-continent" name="continent" class="settings-field__control">
                        <option value="All">🌍 Todos</option>
                        <option value="Africa">🌍 África</option>
                        <option value="America">🌎 América</option>
                        <option value="Asia">🌏 Asia</option>
                        <option value="Europe">🇪🇺 Europa</option>
                        <option value="Oceania">🏝️ Oceanía</option>
                    </select>
                </div>

                <div class="settings-field">
                    <label class="settings-field__label" for="sm-sovereignty">Países incluidos</label>
                    <select id="sm-sovereignty" name="sovereigntyStatus" class="settings-field__control">
                        <option value="All">🌐 Todos</option>
                        <option value="Yes">🏳️ Solo soberanos</option>
                        <option value="No">🏢 Solo territorios</option>
                    </select>
                </div>

                <label class="settings-toggle">
                    <span class="settings-toggle__label">Orden aleatorio</span>
                    <span class="settings-toggle__track">
                        <input id="sm-random" name="randomOrder" type="checkbox" class="settings-toggle__input">
                        <span class="settings-toggle__thumb" aria-hidden="true"></span>
                    </span>
                </label>
            </div>
            <div class="settings-modal__footer">
                <button class="settings-modal__reset" type="button" title="Volver a los valores por defecto">↺ Restablecer</button>
                <button class="settings-modal__cancel" type="button">Cancelar</button>
                <button class="settings-modal__save" type="button">Guardar</button>
            </div>
        </div>
    `;

    // Populate with current values
    const modal = overlay.querySelector('.settings-modal');
    const field = (name) => modal.querySelector(`[name="${name}"]`);
    const resetBtn = modal.querySelector('.settings-modal__reset');
    const fd = globalDefaults.constructor.FACTORY_DEFAULTS;

    field('continent').value         = current.continent;
    field('sovereigntyStatus').value = current.sovereigntyStatus;
    field('randomOrder').checked     = current.randomOrder;

    // Helper: check if current values differ from factory defaults
    const isModified = () =>
        field('continent').value         !== fd.continent         ||
        field('sovereigntyStatus').value !== fd.sovereigntyStatus ||
        field('randomOrder').checked     !== fd.randomOrder;

    // Show reset only when values differ from factory defaults
    resetBtn.hidden = !isModified();

    // Re-evaluate visibility on any change
    const updateResetVisibility = () => { resetBtn.hidden = !isModified(); };
    field('continent').addEventListener('change', updateResetVisibility);
    field('sovereigntyStatus').addEventListener('change', updateResetVisibility);
    field('randomOrder').addEventListener('change', updateResetVisibility);

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

    overlay.querySelector('.settings-modal__reset').addEventListener('click', () => {
        field('continent').value         = fd.continent;
        field('sovereigntyStatus').value = fd.sovereigntyStatus;
        field('randomOrder').checked     = fd.randomOrder;
        updateResetVisibility();
    });

    overlay.querySelector('.settings-modal__save').addEventListener('click', () => {
        globalDefaults.set({
            continent:         field('continent').value,
            sovereigntyStatus: field('sovereigntyStatus').value,
            randomOrder:       field('randomOrder').checked,
        });

        close();
    });
}
