import { AppRouter } from './AppRouter.js';
import { GameSessionManager } from './controllers/GameSessionManager.js';
import { CountryService } from './services/CountryService.js';
import { StatsService } from './services/StatsService.js';
import { AchievementService } from './services/AchievementService.js';
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

    const router = new AppRouter();

    // Game container is the .game-wrapper element
    const gameContainer = document.querySelector('.game-wrapper');

    // Bottom sheet for game configuration
    const bottomSheet = new BottomSheetView({
        countryService,
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
        onPlay: () => bottomSheet.open(null), // open sheet without pre-selected mode (fallback)
        onOpenSettings: () => openSettingsModal(),
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
                updateLandingProgress(statsService, countryService);
                break;

            case 'game':
                // Game screen is managed by GameSessionManager
                break;
        }
    });

    // Preserve settings persistence (legacy filter elements)
    wireSettingsPersistence();

    // Wait for country data to load, then initialize and restore settings
    const waitForInit = setInterval(() => {
        if (countryService.countries && countryService.countries.length > 0) {
            clearInterval(waitForInit);
            wireSettingsPersistence(true);

            // Update landing progress text
            updateLandingProgress(statsService, countryService);

            // Render mode cards directly into the landing
            renderModeCards(bottomSheet);

            // Wire settings button to open settings modal
            const settingsBtn = document.getElementById('landingSettingsBtn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', () => openSettingsModal());
            }
        }
    }, 50);

    // Load country data
    countryService.loadCountries().catch(err => {
        console.error('Failed to load countries:', err);
    });
});

/**
 * Updates the landing progress text with current stats.
 */
function updateLandingProgress(statsService, countryService) {
    const progressEl = document.getElementById('landingProgress');
    if (!progressEl) return;

    try {
        const stats = statsService.getStats();
        const uniqueCorrect = Array.isArray(stats.uniqueCountriesCorrect) ? stats.uniqueCountriesCorrect.length : 0;
        const total = countryService.countries.length;

        const currentEl = progressEl.querySelector('.progress-current');
        const totalEl = progressEl.querySelector('.progress-total');

        if (currentEl) currentEl.textContent = uniqueCorrect;
        if (totalEl) totalEl.textContent = total;

        progressEl.hidden = false;
    } catch {
        // Ignore errors
    }
}

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
    const { modeId, totalScore, correct, wrong, maxStreak, elapsedSeconds, newAchievements } = results;

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

function openSettingsModal() {
    if (document.querySelector('.settings-modal-overlay')) return; // already open

    let saved = {};
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) saved = JSON.parse(raw);
    } catch (e) { /* ignore */ }

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
                <div class="settings-field">
                    <label class="settings-field__label" for="sm-continent">Continente</label>
                    <select id="sm-continent" name="continentFilter" class="settings-field__control">
                        <option value="All">🌍 Todos</option>
                        <option value="Africa">🌍 África</option>
                        <option value="America">🌎 América</option>
                        <option value="Asia">🌏 Asia</option>
                        <option value="Europe">🇪🇺 Europa</option>
                        <option value="Oceania">🏝️ Oceanía</option>
                    </select>
                </div>
                <div class="settings-field">
                    <label class="settings-field__label" for="sm-sovereign">Países incluidos</label>
                    <select id="sm-sovereign" name="sovereignFilter" class="settings-field__control">
                        <option value="All">🌐 Todos</option>
                        <option value="Yes">🏳️ Estados soberanos</option>
                        <option value="No">🏢 Territorios</option>
                    </select>
                </div>
                <div class="settings-field">
                    <label class="settings-field__label" for="sm-max">Cantidad de países</label>
                    <input id="sm-max" name="maxCountries" type="number" min="5" max="250"
                           placeholder="Ej: 50" class="settings-field__control">
                </div>
                <label class="settings-toggle">
                    <span class="settings-toggle__label">Orden aleatorio</span>
                    <span class="settings-toggle__track">
                        <input id="sm-random" name="randomMode" type="checkbox" class="settings-toggle__input">
                        <span class="settings-toggle__thumb" aria-hidden="true"></span>
                    </span>
                </label>
            </div>
            <div class="settings-modal__footer">
                <button class="settings-modal__cancel" type="button">Cancelar</button>
                <button class="settings-modal__save" type="button">Guardar</button>
            </div>
        </div>
    `;

    // Populate with saved values
    const modal = overlay.querySelector('.settings-modal');
    const sel = (name) => modal.querySelector(`[name="${name}"]`);
    if (saved.continentFilter) sel('continentFilter').value = saved.continentFilter;
    if (saved.sovereignFilter) sel('sovereignFilter').value = saved.sovereignFilter;
    if (saved.maxCountries)    sel('maxCountries').value    = saved.maxCountries;
    sel('randomMode').checked = saved.randomMode !== false;

    document.body.appendChild(overlay);
    // Animate in
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

    overlay.querySelector('.settings-modal__save').addEventListener('click', () => {
        const next = {
            continentFilter: sel('continentFilter').value,
            sovereignFilter: sel('sovereignFilter').value,
            maxCountries:    sel('maxCountries').value,
            randomMode:      sel('randomMode').checked,
        };
        // Merge preserving other keys (gameMode, practiceMode, etc.)
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...saved, ...next }));
        } catch (e) { /* quota exceeded */ }

        // Sync legacy hidden inputs for settings persistence
        const sync = {
            continentFilter: document.getElementById('continentFilter'),
            sovereignFilter: document.getElementById('sovereignFilter'),
            maxCountries:    document.getElementById('maxCountries'),
            randomMode:      document.getElementById('randomMode'),
        };
        if (sync.continentFilter) sync.continentFilter.value    = next.continentFilter;
        if (sync.sovereignFilter) sync.sovereignFilter.value    = next.sovereignFilter;
        if (sync.maxCountries)    sync.maxCountries.value       = next.maxCountries;
        if (sync.randomMode)      sync.randomMode.checked       = next.randomMode;

        close();
    });
}

// ─── Settings Persistence (Legacy) ─────────────────────────────────────────

const SETTINGS_KEY = 'flagsQuiz_settings';

/**
 * Persists filter/settings values to localStorage on change,
 * and restores them on page load.
 * @param {boolean} restoreOnly - If true, only restore without re-wiring listeners
 */
function wireSettingsPersistence(restoreOnly = false) {
    const controls = {
        gameModeFilter: document.getElementById('gameModeFilter'),
        continentFilter: document.getElementById('continentFilter'),
        sovereignFilter: document.getElementById('sovereignFilter'),
        maxCountries: document.getElementById('maxCountries'),
        practiceMode: document.getElementById('practiceMode'),
        randomMode: document.getElementById('randomMode'),
        capitalsHintMode: document.getElementById('capitalsHintMode'),
    };

    // Restore saved settings
    restoreSettings(controls);

    if (restoreOnly) return;

    // Save on any change
    Object.entries(controls).forEach(([key, el]) => {
        if (!el) return;
        el.addEventListener('change', () => saveSettings(controls));
        if (el.type === 'number') {
            el.addEventListener('input', () => saveSettings(controls));
        }
    });
}

function saveSettings(controls) {
    const settings = {};
    Object.entries(controls).forEach(([key, el]) => {
        if (!el) return;
        if (el.type === 'checkbox') {
            settings[key] = el.checked;
        } else {
            settings[key] = el.value;
        }
    });
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) { /* quota exceeded or private mode */ }
}

function restoreSettings(controls) {
    let settings;
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return;
        settings = JSON.parse(raw);
    } catch (e) { return; }

    Object.entries(settings).forEach(([key, value]) => {
        const el = controls[key];
        if (!el) return;
        if (el.type === 'checkbox') {
            el.checked = value;
        } else if (el.type === 'number') {
            const max = parseInt(el.max, 10);
            const numVal = parseInt(value, 10);
            if (!isNaN(numVal) && (!max || numVal <= max) && numVal >= 1) {
                el.value = value;
            }
        } else {
            if (el.tagName === 'SELECT') {
                const options = Array.from(el.options).map(o => o.value);
                if (options.includes(value)) {
                    el.value = value;
                }
            } else {
                el.value = value;
            }
        }
    });

    // Trigger change on gameModeFilter to update UI visibility
    const gameModeFilter = controls.gameModeFilter;
    if (gameModeFilter) {
        gameModeFilter.dispatchEvent(new Event('change'));
    }
}
