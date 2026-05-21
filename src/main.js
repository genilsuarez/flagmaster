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
        onOpenSettings: () => router.navigate('modeSelector'),
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

    // Wire landing settings button → navigate to mode selector
    const landingSettingsBtn = document.getElementById('landingSettingsBtn');
    landingSettingsBtn?.addEventListener('click', () => {
        router.navigate('modeSelector');
    });

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
