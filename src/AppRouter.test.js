import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AppRouter } from './AppRouter.js';

/**
 * Sets up a minimal DOM with screen containers for testing.
 */
function setupDOM() {
    document.body.innerHTML = `
        <main id="homeScreen"></main>
        <div class="game-wrapper"></div>
    `;
    document.body.className = '';
}

describe('AppRouter', () => {
    let router;

    beforeEach(() => {
        setupDOM();
        router = new AppRouter();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        document.body.className = '';
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('initializes with home as the current screen', () => {
            expect(router.getCurrentScreen()).toBe('home');
        });

        it('starts with an empty history stack', () => {
            expect(router.canGoBack()).toBe(false);
        });

        it('applies home body class on initialization', () => {
            expect(document.body.classList.contains('screen-home')).toBe(true);
        });

        it('shows the home container and hides others', () => {
            const home = document.getElementById('homeScreen');
            const game = document.querySelector('.game-wrapper');

            expect(home.classList.contains('screen-hidden')).toBe(false);
            expect(game.classList.contains('screen-hidden')).toBe(true);
        });

        it('does not apply legacy landing-mode class', () => {
            expect(document.body.classList.contains('landing-mode')).toBe(false);
        });
    });

    describe('SCREENS', () => {
        it('contains only home and game', () => {
            expect(AppRouter.SCREENS).toEqual(['home', 'game']);
        });

        it('does not contain legacy screens', () => {
            expect(AppRouter.SCREENS).not.toContain('landing');
            expect(AppRouter.SCREENS).not.toContain('modeSelector');
            expect(AppRouter.SCREENS).not.toContain('parametrization');
        });
    });

    describe('navigate()', () => {
        it('transitions to the target screen', () => {
            router.navigate('game');
            expect(router.getCurrentScreen()).toBe('game');
        });

        it('pushes the previous screen onto the history stack', () => {
            router.navigate('game');
            expect(router.canGoBack()).toBe(true);
        });

        it('updates the body class to the new screen', () => {
            router.navigate('game');
            expect(document.body.classList.contains('screen-game')).toBe(true);
            expect(document.body.classList.contains('screen-home')).toBe(false);
        });

        it('shows the target container and hides others', () => {
            router.navigate('game');

            const home = document.getElementById('homeScreen');
            const game = document.querySelector('.game-wrapper');

            expect(home.classList.contains('screen-hidden')).toBe(true);
            expect(game.classList.contains('screen-hidden')).toBe(false);
        });

        it('sets aria-hidden on hidden containers', () => {
            router.navigate('game');

            const home = document.getElementById('homeScreen');
            const game = document.querySelector('.game-wrapper');

            expect(home.getAttribute('aria-hidden')).toBe('true');
            expect(game.hasAttribute('aria-hidden')).toBe(false);
        });

        it('adds fade-in class to the shown container', () => {
            router.navigate('game');
            const game = document.querySelector('.game-wrapper');
            expect(game.classList.contains('screen-fade-in')).toBe(true);
        });

        it('adds fade-out class to hidden containers', () => {
            router.navigate('game');
            const home = document.getElementById('homeScreen');
            expect(home.classList.contains('screen-fade-out')).toBe(true);
        });

        it('does nothing when navigating to the current screen', () => {
            router.navigate('home');
            expect(router.canGoBack()).toBe(false);
        });

        it('warns and does nothing for unknown screens', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            router.navigate('unknown');
            expect(router.getCurrentScreen()).toBe('home');
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown screen'));
        });

        it('warns and does nothing for legacy screen names', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            router.navigate('landing');
            expect(router.getCurrentScreen()).toBe('home');
            expect(warnSpy).toHaveBeenCalled();

            router.navigate('modeSelector');
            expect(router.getCurrentScreen()).toBe('home');

            router.navigate('parametrization');
            expect(router.getCurrentScreen()).toBe('home');
        });

        it('dispatches app:navigate event with screen and params', () => {
            const handler = vi.fn();
            document.addEventListener('app:navigate', handler);

            router.navigate('game', { modeId: 'flagRush' });

            expect(handler).toHaveBeenCalledTimes(1);
            const detail = handler.mock.calls[0][0].detail;
            expect(detail.screen).toBe('game');
            expect(detail.params.modeId).toBe('flagRush');

            document.removeEventListener('app:navigate', handler);
        });

        it('calls history.pushState with screen state', () => {
            const pushStateSpy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
            router.navigate('game');
            expect(pushStateSpy).toHaveBeenCalledWith({ screen: 'game' }, '', '');
        });

        it('builds up history with sequential navigation', () => {
            router.navigate('game');
            expect(router.history).toEqual(['home']);
        });
    });

    describe('back()', () => {
        it('returns to the previous screen', () => {
            router.navigate('game');
            const result = router.back();

            expect(result).toBe('home');
            expect(router.getCurrentScreen()).toBe('home');
        });

        it('pops the history stack', () => {
            router.navigate('game');
            router.back();

            expect(router.canGoBack()).toBe(false);
        });

        it('returns home when history is empty', () => {
            const result = router.back();
            expect(result).toBe('home');
            expect(router.getCurrentScreen()).toBe('home');
        });

        it('updates body class on back navigation', () => {
            router.navigate('game');
            router.back();

            expect(document.body.classList.contains('screen-home')).toBe(true);
            expect(document.body.classList.contains('screen-game')).toBe(false);
        });

        it('dispatches app:navigate event with isBack flag', () => {
            router.navigate('game');

            const handler = vi.fn();
            document.addEventListener('app:navigate', handler);

            router.back();

            const detail = handler.mock.calls[0][0].detail;
            expect(detail.params.isBack).toBe(true);

            document.removeEventListener('app:navigate', handler);
        });
    });

    describe('reset()', () => {
        it('navigates to the specified screen and clears history', () => {
            router.navigate('game');
            router.reset('home');

            expect(router.getCurrentScreen()).toBe('home');
            expect(router.canGoBack()).toBe(false);
        });

        it('defaults to home when no screen is specified', () => {
            router.navigate('game');
            router.reset();

            expect(router.getCurrentScreen()).toBe('home');
        });

        it('updates body class correctly', () => {
            router.navigate('game');
            router.reset('home');

            expect(document.body.classList.contains('screen-home')).toBe(true);
            expect(document.body.classList.contains('screen-game')).toBe(false);
        });

        it('dispatches app:navigate event with isReset flag', () => {
            const handler = vi.fn();
            document.addEventListener('app:navigate', handler);

            router.navigate('game');
            router.reset('home');

            const lastCall = handler.mock.calls[handler.mock.calls.length - 1][0].detail;
            expect(lastCall.params.isReset).toBe(true);

            document.removeEventListener('app:navigate', handler);
        });

        it('warns and does nothing for unknown screens', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            router.navigate('game');
            router.reset('invalid');

            expect(router.getCurrentScreen()).toBe('game');
            expect(warnSpy).toHaveBeenCalled();
        });
    });

    describe('canGoBack()', () => {
        it('returns false when history is empty', () => {
            expect(router.canGoBack()).toBe(false);
        });

        it('returns true after a navigation', () => {
            router.navigate('game');
            expect(router.canGoBack()).toBe(true);
        });

        it('returns false after navigating back to the start', () => {
            router.navigate('game');
            router.back();
            expect(router.canGoBack()).toBe(false);
        });
    });

    describe('body class management', () => {
        it('only has one screen class at a time', () => {
            router.navigate('game');

            const screenClasses = AppRouter.SCREENS
                .map(s => `screen-${s}`)
                .filter(cls => document.body.classList.contains(cls));

            expect(screenClasses).toHaveLength(1);
            expect(screenClasses[0]).toBe('screen-game');
        });

        it('does not add landing-mode class for any screen', () => {
            router.navigate('game');
            expect(document.body.classList.contains('landing-mode')).toBe(false);

            router.back();
            expect(document.body.classList.contains('landing-mode')).toBe(false);
        });
    });

    describe('popstate listener', () => {
        it('resets to home when popstate fires on game screen', () => {
            router.navigate('game');

            // Simulate browser back button
            window.dispatchEvent(new PopStateEvent('popstate'));

            expect(router.getCurrentScreen()).toBe('home');
            expect(router.canGoBack()).toBe(false);
        });

        it('does nothing when popstate fires on home screen', () => {
            // Already on home
            window.dispatchEvent(new PopStateEvent('popstate'));

            expect(router.getCurrentScreen()).toBe('home');
        });
    });

    describe('container visibility', () => {
        it('handles missing containers gracefully', () => {
            // Remove a container from the DOM
            document.getElementById('homeScreen').remove();

            // Re-create router with missing container
            const router2 = new AppRouter();
            expect(() => router2.navigate('game')).not.toThrow();
        });
    });
});
