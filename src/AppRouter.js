/**
 * AppRouter v2: manages screen transitions for Home ↔ Game flow.
 *
 * Simplified from 4 screens to 2, integrating with browser History API
 * for back-button support and CSS transitions for smooth navigation.
 *
 * Screens: home, game
 */
export class AppRouter {
    /** @type {string[]} All valid screen identifiers */
    static SCREENS = ['home', 'game'];

    /** @type {string} CSS class prefix applied to <body> for each screen */
    static BODY_CLASS_PREFIX = 'screen-';

    /** @type {string} CSS class for fade-in animation */
    static FADE_IN_CLASS = 'screen-fade-in';

    /** @type {string} CSS class for fade-out animation */
    static FADE_OUT_CLASS = 'screen-fade-out';

    constructor() {
        /** @type {string} Currently active screen */
        this.currentScreen = 'home';

        /** @type {string[]} Navigation history stack for back-navigation */
        this.history = [];

        /** @type {Object<string, HTMLElement|null>} Cached screen container references */
        this.containers = {};

        this._cacheContainers();
        this._applyScreen('home');
        this._initPopstateListener();
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

        // Integrate with browser History API
        try {
            window.history.pushState({ screen }, '', '');
        } catch (e) {
            // Silently handle environments where pushState is unavailable
        }

        this._dispatchNavigationEvent(screen, params);
    }

    /**
     * Navigate back to the previous screen in the history stack.
     * If history is empty, stays on home.
     * @returns {string} The screen navigated to
     */
    back() {
        const previousScreen = this.history.pop() || 'home';
        this.currentScreen = previousScreen;
        this._applyScreen(previousScreen);

        this._dispatchNavigationEvent(previousScreen, { isBack: true });
        return previousScreen;
    }

    /**
     * Navigate directly to a screen without pushing to history.
     * Useful for resetting to home after game end.
     * @param {string} screen - Target screen identifier
     * @param {Object} [params={}] - Optional parameters
     */
    reset(screen = 'home', params = {}) {
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
     * @private
     */
    _cacheContainers() {
        this.containers = {
            home: document.getElementById('homeScreen'),
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
                container.classList.remove(AppRouter.FADE_IN_CLASS);
                container.classList.add(AppRouter.FADE_OUT_CLASS);
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
            container.classList.remove(AppRouter.FADE_OUT_CLASS);
            container.classList.add(AppRouter.FADE_IN_CLASS);
            container.removeAttribute('aria-hidden');
        }
    }

    /**
     * Updates the body class to reflect the current screen.
     * Removes all screen-* classes and adds the active one.
     * @param {string} screen - Active screen identifier
     * @private
     */
    _updateBodyClass(screen) {
        const body = document.body;

        // Remove all screen-related classes
        AppRouter.SCREENS.forEach(s => {
            body.classList.remove(`${AppRouter.BODY_CLASS_PREFIX}${s}`);
        });

        // Add current screen class
        body.classList.add(`${AppRouter.BODY_CLASS_PREFIX}${screen}`);
    }

    /**
     * Initializes the popstate listener for browser back-button support.
     * When on the game screen, pressing back navigates to home.
     * @private
     */
    _initPopstateListener() {
        window.addEventListener('popstate', (e) => {
            if (this.currentScreen === 'game') {
                this.reset('home');
            }
        });
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
