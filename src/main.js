import { GameController } from './controllers/GameController.js';
import { WordDropController } from './controllers/WordDropController.js';
import { StatsService } from './services/StatsService.js';
import { AppMenu } from './views/AppMenu.js';

/**
 * Application entry point
 */
document.addEventListener('DOMContentLoaded', () => {
    const controller = new GameController();
    const statsService = new StatsService();
    const wordDropController = new WordDropController(controller.countryService, statsService);

    const appMenu = new AppMenu({
        statsService,
        onPlay: () => exitLanding(controller, wordDropController),
        onOpenSettings: () => {
            const filterContainer = document.getElementById('filterContainer');
            if (filterContainer) {
                filterContainer.classList.add('show');
            }
        },
        onHome: () => appMenu.updateMotivationUI()
    });

    wireSettingsPersistence();
    wireLandingHero(controller, wordDropController, appMenu);
    wireStatsTracking(controller, statsService, appMenu);
    wireWordDropModeToggle();

    // Re-restore settings after GameController finishes async init
    // (initializeGame overwrites maxCountries after loading countries)
    const waitForInit = setInterval(() => {
        if (controller.countryService.countries && controller.countryService.countries.length > 0) {
            clearInterval(waitForInit);
            wireSettingsPersistence(true);
        }
    }, 50);
});

function exitLanding(controller, wordDropController) {
    const gameModeFilter = document.getElementById('gameModeFilter');
    const gameMode = gameModeFilter?.value || 'flags';

    document.body.classList.remove('landing-mode');

    if (gameMode === 'wordDrop') {
        startWordDropGame(controller, wordDropController);
    } else {
        document.getElementById('startButton')?.click();
    }
}

/**
 * Starts a Word Drop game using the current filter settings.
 */
function startWordDropGame(controller, wordDropController) {
    const filters = controller.view.getFilterValues();
    const countries = controller.countryService.filterCountries(filters);

    if (countries.length === 0) {
        alert('No countries match the selected filters');
        document.body.classList.add('landing-mode');
        return;
    }

    const categoryEl = document.getElementById('wordDropCategory');
    const speedEl = document.getElementById('wordDropSpeed');
    const difficultyEl = document.getElementById('wordDropDifficulty');
    const survivalEl = document.getElementById('wordDropSurvival');

    const difficulty = difficultyEl?.value || 'easy';
    const showFlag = difficulty === 'easy';

    wordDropController.start({
        countries: [...countries],
        category: categoryEl?.value || 'country',
        speed: speedEl?.value || 'normal',
        showFlag,
        survival: survivalEl?.checked !== false,
        difficulty
    });
}

/**
 * Wires the main landing CTA and return-to-landing on game end.
 */
function wireLandingHero(controller, wordDropController, appMenu) {
    const body = document.body;
    const cta = document.getElementById('landingCTA');
    const settingsBtn = document.getElementById('landingSettingsBtn');

    cta?.addEventListener('click', () => exitLanding(controller, wordDropController));

    // Settings gear button opens the config panel directly
    settingsBtn?.addEventListener('click', () => {
        const filterContainer = document.getElementById('filterContainer');
        if (filterContainer) {
            filterContainer.classList.add('show');
        }
    });

    // Return to landing when the game end modal's "Play Again" is pressed
    document.addEventListener('click', (event) => {
        const target = event.target;
        if (target instanceof HTMLElement && target.classList.contains('modal-close-btn')) {
            body.classList.add('landing-mode');
            appMenu.updateMotivationUI();
        }
    });
}

/**
 * Hooks into GameController lifecycle to record stats without mutating it.
 * Wraps endGame so we capture results right before the modal is shown.
 */
function wireStatsTracking(controller, statsService, appMenu) {
    const originalEndGame = controller.endGame.bind(controller);
    controller.endGame = function patchedEndGame() {
        const scores = this.gameState.teamScores;
        const correct = (scores?.red || 0) + (scores?.green || 0);
        const wrong = scores?.blue || 0;
        const elapsed = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
        statsService.recordGame({ correct, wrong, elapsedSeconds: elapsed });
        appMenu.updateMotivationUI();
        return originalEndGame();
    };

    // Track unique countries correct when a team scores (not blue = draw)
    const originalHandleTeamScore = controller.handleTeamScore.bind(controller);
    controller.handleTeamScore = function patchedHandleTeamScore(teamColor) {
        if (teamColor !== 'blue' && this.countryInfoRevealed && this.gameState.isActive) {
            const country = this.gameService.getCurrentCountry(this.filteredCountries);
            if (country?.englishName) statsService.recordCountryCorrect(country.englishName);
        }
        return originalHandleTeamScore(teamColor);
    };
}



/**
 * Shows/hides Word Drop specific options when the game mode changes.
 * Continent and sovereignty filters remain visible in all modes since
 * Word Drop also uses them to determine which countries to include.
 */
function wireWordDropModeToggle() {
    const gameModeFilter = document.getElementById('gameModeFilter');
    const wordDropOptions = document.getElementById('wordDropOptions');
    const capitalsOptions = document.getElementById('capitalsOptions');

    if (!gameModeFilter || !wordDropOptions) return;

    // Elements that only apply to the standard game modes (not Word Drop)
    const standardOnlyEls = [
        document.querySelector('.practice-mode-container')?.closest('.filter-row'),
    ].filter(Boolean);

    const toggleOptions = () => {
        const mode = gameModeFilter.value;
        const isWordDrop = mode === 'wordDrop';
        const isCapitals = mode === 'capitals';

        wordDropOptions.hidden = !isWordDrop;
        if (capitalsOptions) capitalsOptions.hidden = !isCapitals;

        standardOnlyEls.forEach(el => {
            if (el) el.style.display = isWordDrop ? 'none' : '';
        });
    };

    gameModeFilter.addEventListener('change', toggleOptions);
    toggleOptions();
}

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
        wordDropDifficulty: document.getElementById('wordDropDifficulty'),
        wordDropCategory: document.getElementById('wordDropCategory'),
        wordDropSpeed: document.getElementById('wordDropSpeed'),
        wordDropSurvival: document.getElementById('wordDropSurvival'),
        capitalsHintMode: document.getElementById('capitalsHintMode'),
    };

    // Restore saved settings
    restoreSettings(controls);

    if (restoreOnly) return;

    // Save on any change
    Object.entries(controls).forEach(([key, el]) => {
        if (!el) return;
        el.addEventListener('change', () => saveSettings(controls));
        // Also listen to input for number fields
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
            // Only restore if within valid range
            const max = parseInt(el.max, 10);
            const numVal = parseInt(value, 10);
            if (!isNaN(numVal) && (!max || numVal <= max) && numVal >= 1) {
                el.value = value;
            }
        } else {
            // Verify the value is a valid option for select elements
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
