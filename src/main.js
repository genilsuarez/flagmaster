import { AppRouter } from './AppRouter.js';
import { GameSessionManager } from './controllers/GameSessionManager.js';
import { CountryService } from './services/CountryService.js';
import { StatsService } from './services/StatsService.js';
import { AchievementService } from './services/AchievementService.js';
import { ModeSelectorView } from './views/ModeSelectorView.js';
import { ParametrizationView } from './views/ParametrizationView.js';
import { GameEndModalView } from './views/GameEndModalView.js';
import { AchievementToast } from './views/AchievementToast.js';
import { AppMenu } from './views/AppMenu.js';

/**
 * Application entry point.
 *
 * Uses AppRouter for screen navigation and GameSessionManager for game orchestration.
 * The flow is: Landing → ModeSelector → Parametrization → Game → (Results) → Landing.
 */
document.addEventListener('DOMContentLoaded', () => {
    const countryService = new CountryService();
    const statsService = new StatsService();
    const achievementService = new AchievementService();

    const router = new AppRouter();

    // Game container is the .game-wrapper element
    const gameContainer = document.querySelector('.game-wrapper');

    // Session manager orchestrates all game modes
    const sessionManager = new GameSessionManager({
        container: gameContainer,
        countryService,
        statsService,
        achievementService,
        onSessionEnd: (results) => {
            handleSessionEnd(results, router, gameEndModal);
            // Show achievement toast notifications
            if (results.newAchievements && results.newAchievements.length > 0) {
                achievementToast.show(results.newAchievements);
            }
        },
    });

    // Game end modal for showing results
    const gameEndModal = new GameEndModalView({
        onPlayAgain: (modeId) => handlePlayAgain(modeId, router),
        onHome: () => router.reset('landing'),
    });

    // Achievement toast for unlock notifications
    const achievementToast = new AchievementToast();

    // Views for mode selection and parametrization
    let modeSelectorView = null;
    let parametrizationView = null;
    let selectedModeId = null;

    // App menu (drawer)
    const appMenu = new AppMenu({
        statsService,
        onPlay: () => router.navigate('modeSelector'),
        onOpenSettings: () => openSettingsModal(),
        onHome: () => {
            router.reset('landing');
            appMenu.updateMotivationUI();
        },
    });

    // Listen for navigation events to initialize/destroy views
    document.addEventListener('app:navigate', (event) => {
        const { screen, params } = event.detail;

        switch (screen) {
            case 'landing':
                destroyViews();
                appMenu.updateMotivationUI();
                break;

            case 'modeSelector':
                destroyViews();
                modeSelectorView = new ModeSelectorView({
                    onSelect: (modeId) => {
                        selectedModeId = modeId;
                        router.navigate('parametrization', { modeId });
                    },
                    onBack: () => router.back(),
                });
                break;

            case 'parametrization':
                if (modeSelectorView) {
                    modeSelectorView.destroy();
                    modeSelectorView = null;
                }
                const modeId = params.modeId || selectedModeId;
                if (!modeId) {
                    router.back();
                    return;
                }
                parametrizationView = new ParametrizationView({
                    countryService,
                    onBack: () => router.back(),
                    onPlay: (config) => startGame(config, router, sessionManager, countryService),
                });
                parametrizationView.setMode(modeId);
                break;

            case 'game':
                if (parametrizationView) {
                    parametrizationView.destroy();
                    parametrizationView = null;
                }
                break;
        }
    });

    // Wire Landing CTA → navigate to mode selector
    const landingCTA = document.getElementById('landingCTA');
    landingCTA?.addEventListener('click', () => {
        router.navigate('modeSelector');
    });

    // Wire landing settings button → open settings modal (separate from play flow)
    const landingSettingsBtn = document.getElementById('landingSettingsBtn');
    landingSettingsBtn?.addEventListener('click', () => openSettingsModal());

    // Preserve settings persistence (legacy filter elements)
    wireSettingsPersistence();

    // Wait for country data to load, then restore settings
    const waitForInit = setInterval(() => {
        if (countryService.countries && countryService.countries.length > 0) {
            clearInterval(waitForInit);
            wireSettingsPersistence(true);
        }
    }, 50);

    // Load country data
    countryService.loadCountries().catch(err => {
        console.error('Failed to load countries:', err);
    });

    /**
     * Destroys mode selector and parametrization views.
     */
    function destroyViews() {
        if (modeSelectorView) {
            modeSelectorView.destroy();
            modeSelectorView = null;
        }
        if (parametrizationView) {
            parametrizationView.destroy();
            parametrizationView = null;
        }
    }
});

/**
 * Starts a game session with the given config from ParametrizationView.
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
function handleSessionEnd(results, router, gameEndModal) {
    const { modeId, totalScore, correct, wrong, maxStreak, elapsedSeconds, newAchievements } = results;

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
 * Navigates back to parametrization with the same mode pre-selected.
 */
function handlePlayAgain(modeId, router) {
    router.navigate('parametrization', { modeId });
}

// ─── Settings Modal ─────────────────────────────────────────────────────────

function openSettingsModal() {
    if (document.querySelector('.settings-modal-overlay')) return; // already open

    let saved = {};
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) saved = JSON.parse(raw);
    } catch (e) { /* ignore */ }

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

    const activeCont = saved.continentFilter || 'All';
    const activeSov  = saved.sovereignFilter || 'All';

    const makeChips = (options, activeValue, name) =>
        options.map(o => `<button type="button" class="settings-chip${o.value === activeValue ? ' is-selected' : ''}" data-group="${name}" data-value="${o.value}">${o.label}</button>`).join('');

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
                    <p class="settings-modal__subtitle">Se aplicarán como punto de partida en cada juego</p>
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
                        ${makeChips(continentOptions, activeCont, 'continentFilter')}
                    </div>
                </div>
                <div class="settings-field">
                    <span class="settings-field__label">🏳️ Países incluidos</span>
                    <div class="settings-chips" role="group" aria-label="Países incluidos">
                        ${makeChips(sovereignOptions, activeSov, 'sovereignFilter')}
                    </div>
                </div>
                <div class="settings-field">
                    <label class="settings-field__label" for="sm-max">🔢 Cantidad máxima</label>
                    <input id="sm-max" name="maxCountries" type="number" min="5" max="250"
                           placeholder="Ej: 50 (dejar vacío = todos)" class="settings-field__control"
                           value="${saved.maxCountries || ''}">
                </div>
                <label class="settings-toggle">
                    <span class="settings-toggle__label">
                        <span class="settings-toggle__label-text">🔀 Orden aleatorio</span>
                        <span class="settings-toggle__label-hint">Mezcla las banderas en cada partida</span>
                    </span>
                    <span class="settings-toggle__track">
                        <input id="sm-random" name="randomMode" type="checkbox" class="settings-toggle__input"${saved.randomMode !== false ? ' checked' : ''}>
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

    // Chip selection logic
    overlay.addEventListener('click', (e) => {
        const chip = e.target.closest('.settings-chip');
        if (!chip) return;
        const group = chip.dataset.group;
        overlay.querySelectorAll(`.settings-chip[data-group="${group}"]`).forEach(c => c.classList.remove('is-selected'));
        chip.classList.add('is-selected');
    });

    const modal = overlay.querySelector('.settings-modal');

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

    const saveBtn = overlay.querySelector('.settings-modal__save');
    saveBtn.addEventListener('click', () => {
        const getChipValue = (group) => overlay.querySelector(`.settings-chip[data-group="${group}"].is-selected`)?.dataset.value || 'All';
        const next = {
            continentFilter: getChipValue('continentFilter'),
            sovereignFilter: getChipValue('sovereignFilter'),
            maxCountries:    modal.querySelector('[name="maxCountries"]').value,
            randomMode:      modal.querySelector('[name="randomMode"]').checked,
        };
        // Merge preserving other keys (gameMode, practiceMode, etc.)
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...saved, ...next }));
        } catch (e) { /* quota exceeded */ }

        // Sync legacy hidden inputs so ParametrizationView picks them up
        const sync = {
            continentFilter: document.getElementById('continentFilter'),
            sovereignFilter: document.getElementById('sovereignFilter'),
            maxCountries:    document.getElementById('maxCountries'),
            randomMode:      document.getElementById('randomMode'),
        };
        if (sync.continentFilter) sync.continentFilter.value = next.continentFilter;
        if (sync.sovereignFilter) sync.sovereignFilter.value = next.sovereignFilter;
        if (sync.maxCountries)    sync.maxCountries.value    = next.maxCountries;
        if (sync.randomMode)      sync.randomMode.checked    = next.randomMode;

        // Brief confirmation then close
        saveBtn.classList.add('is-saved');
        saveBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> ¡Guardado!`;
        setTimeout(close, 700);
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
