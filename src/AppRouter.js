/**
 * AppRouter: manages screen transitions for the application.
 *
 * Replaces the previous `landing-mode` body class toggle with a proper
 * state machine that shows/hides screen containers and manages body classes.
 *
 * Screens: landing, modeSelector, parametrization, game
 */
export class AppRouter {
    /** @type {string[]} All valid screen identifiers */
    static SCREENS = ['landing', 'modeSelector', 'parametrization', 'game'];

    /** @type {string} CSS class prefix applied to <body> for each screen */
    static BODY_CLASS_PREFIX = 'screen-';

    constructor() {
        /** @type {string} Currently active screen */
        this.currentScreen = 'landing';

        /** @type {string[]} Navigation history stack for back-navigation */
        this.history = [];

        /** @type {Object<string, HTMLElement|null>} Cached screen container references */
        this.containers = {};

        this._cacheContainers();
        this._applyScreen('landing');
    }

    /**
     * Navigate to a screen, pushing the current screen onto the history stack.
     * @param {string} screen - Target screen identifier
     * @param {Object} [params={}] - Optional parameters passed to the screen
     */
    navigate(screen, params = {}) {
        if (!AppRouter.SCREENS.includes(screen)) {
            console.warn(`[AppRouter] Unknown screen: "${screen}"`);
            return;
        }

        if (screen === this.currentScreen) return;

        this.history.push(this.currentScreen);
        this.currentScreen = screen;
        this._applyScreen(screen);

        this._dispatchNavigationEvent(screen, params);
    }

    /**
     * Navigate back to the previous screen in the history stack.
     * If history is empty, navigates to landing.
     * @returns {string} The screen navigated to
     */
    back() {
        const previousScreen = this.history.pop() || 'landing';
        this.currentScreen = previousScreen;
        this._applyScreen(previousScreen);

        this._dispatchNavigationEvent(previousScreen, { isBack: true });
        return previousScreen;
    }

    /**
     * Navigate directly to a screen without pushing to history.
     * Useful for resetting to landing after game end.
     * @param {string} screen - Target screen identifier
     * @param {Object} [params={}] - Optional parameters
     */
    reset(screen = 'landing', params = {}) {
        if (!AppRouter.SCREENS.includes(screen)) {
            console.warn(`[AppRouter] Unknown screen: "${screen}"`);
            return;
        }

        this.history = [];
        this.currentScreen = screen;
        this._applyScreen(screen);

        this._dispatchNavigationEvent(screen, { isReset: true, ...params });
    }

    /**
     * Returns the current active screen identifier.
     * @returns {string}
     */
    getCurrentScreen() {
        return this.currentScreen;
    }

    /**
     * Returns whether back-navigation is possible.
     * @returns {boolean}
     */
    canGoBack() {
        return this.history.length > 0;
    }

    // ─── Private Methods ─────────────────────────────────────────────

    /**
     * Caches DOM references for screen containers.
     * Containers are identified by `data-screen` attribute or known IDs.
     * @private
     */
    _cacheContainers() {
        this.containers = {
            landing: document.getElementById('landingHero'),
            modeSelector: document.getElementById('modeSelectorScreen'),
            parametrization: document.getElementById('parametrizationScreen'),
            game: document.querySelector('.game-wrapper'),
        };
    }

    /**
     * Applies the screen transition: hides all containers, shows the target,
     * and updates the body class.
     * @param {string} screen - Screen to show
     * @private
     */
    _applyScreen(screen) {
        this._hideAll();
        this._showContainer(screen);
        this._updateBodyClass(screen);
    }

    /**
     * Hides all screen containers by adding the `screen-hidden` class.
     * @private
     */
    _hideAll() {
        for (const [key, container] of Object.entries(this.containers)) {
            if (container) {
                container.classList.add('screen-hidden');
                container.setAttribute('aria-hidden', 'true');
            }
        }
    }

    /**
     * Shows a specific screen container by removing the `screen-hidden` class.
     * @param {string} screen - Screen identifier to show
     * @private
     */
    _showContainer(screen) {
        const container = this.containers[screen];
        if (container) {
            container.classList.remove('screen-hidden');
            container.removeAttribute('aria-hidden');
        }
    }

    /**
     * Updates the body class to reflect the current screen.
     * Removes all screen-* classes and adds the active one.
     * Also manages legacy `landing-mode` class for backward compatibility.
     * @param {string} screen - Active screen identifier
     * @private
     */
    _updateBodyClass(screen) {
        const body = document.body;

        // Remove all screen-related classes
        AppRouter.SCREENS.forEach(s => {
            body.classList.remove(`${AppRouter.BODY_CLASS_PREFIX}${s}`);
        });

        // Remove legacy class
        body.classList.remove('landing-mode');

        // Add current screen class
        body.classList.add(`${AppRouter.BODY_CLASS_PREFIX}${screen}`);

        // Maintain backward compatibility with landing-mode
        if (screen === 'landing') {
            body.classList.add('landing-mode');
        }
    }

    /**
     * Dispatches a custom event on document for other modules to react to navigation.
     * @param {string} screen - Target screen
     * @param {Object} params - Navigation parameters
     * @private
     */
    _dispatchNavigationEvent(screen, params) {
        document.dispatchEvent(new CustomEvent('app:navigate', {
            detail: { screen, params }
        }));
    }
}
