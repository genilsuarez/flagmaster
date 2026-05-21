import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AppRouter } from './AppRouter.js';

/**
 * Sets up a minimal DOM with screen containers for testing.
 */
function setupDOM() {
    document.body.innerHTML = `
        <section id="landingHero"></section>
        <div id="modeSelectorScreen"></div>
        <div id="parametrizationScreen"></div>
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
    });

    describe('constructor', () => {
        it('initializes with landing as the current screen', () => {
            expect(router.getCurrentScreen()).toBe('landing');
        });

        it('starts with an empty history stack', () => {
            expect(router.canGoBack()).toBe(false);
        });

        it('applies landing body class on initialization', () => {
            expect(document.body.classList.contains('screen-landing')).toBe(true);
        });

        it('applies legacy landing-mode class on initialization', () => {
            expect(document.body.classList.contains('landing-mode')).toBe(true);
        });

        it('shows the landing container and hides others', () => {
            const landing = document.getElementById('landingHero');
            const modeSelector = document.getElementById('modeSelectorScreen');

            expect(landing.classList.contains('screen-hidden')).toBe(false);
            expect(modeSelector.classList.contains('screen-hidden')).toBe(true);
        });
    });

    describe('navigate()', () => {
        it('transitions to the target screen', () => {
            router.navigate('modeSelector');
            expect(router.getCurrentScreen()).toBe('modeSelector');
        });

        it('pushes the previous screen onto the history stack', () => {
            router.navigate('modeSelector');
            expect(router.canGoBack()).toBe(true);
        });

        it('updates the body class to the new screen', () => {
            router.navigate('modeSelector');
            expect(document.body.classList.contains('screen-modeSelector')).toBe(true);
            expect(document.body.classList.contains('screen-landing')).toBe(false);
        });

        it('removes legacy landing-mode class when navigating away from landing', () => {
            router.navigate('modeSelector');
            expect(document.body.classList.contains('landing-mode')).toBe(false);
        });

        it('shows the target container and hides others', () => {
            router.navigate('modeSelector');

            const landing = document.getElementById('landingHero');
            const modeSelector = document.getElementById('modeSelectorScreen');

            expect(landing.classList.contains('screen-hidden')).toBe(true);
            expect(modeSelector.classList.contains('screen-hidden')).toBe(false);
        });

        it('sets aria-hidden on hidden containers', () => {
            router.navigate('game');

            const landing = document.getElementById('landingHero');
            const game = document.querySelector('.game-wrapper');

            expect(landing.getAttribute('aria-hidden')).toBe('true');
            expect(game.hasAttribute('aria-hidden')).toBe(false);
        });

        it('does nothing when navigating to the current screen', () => {
            router.navigate('landing');
            expect(router.canGoBack()).toBe(false);
        });

        it('warns and does nothing for unknown screens', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            router.navigate('unknown');
            expect(router.getCurrentScreen()).toBe('landing');
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown screen'));
            warnSpy.mockRestore();
        });

        it('dispatches app:navigate event with screen and params', () => {
            const handler = vi.fn();
            document.addEventListener('app:navigate', handler);

            router.navigate('parametrization', { modeId: 'flagRush' });

            expect(handler).toHaveBeenCalledTimes(1);
            const detail = handler.mock.calls[0][0].detail;
            expect(detail.screen).toBe('parametrization');
            expect(detail.params.modeId).toBe('flagRush');

            document.removeEventListener('app:navigate', handler);
        });

        it('supports sequential navigation building up history', () => {
            router.navigate('modeSelector');
            router.navigate('parametrization');
            router.navigate('game');

            expect(router.getCurrentScreen()).toBe('game');
            expect(router.history).toEqual(['landing', 'modeSelector', 'parametrization']);
        });
    });

    describe('back()', () => {
        it('returns to the previous screen', () => {
            router.navigate('modeSelector');
            const result = router.back();

            expect(result).toBe('landing');
            expect(router.getCurrentScreen()).toBe('landing');
        });

        it('pops the history stack', () => {
            router.navigate('modeSelector');
            router.navigate('parametrization');
            router.back();

            expect(router.getCurrentScreen()).toBe('modeSelector');
            expect(router.canGoBack()).toBe(true);
        });

        it('navigates to landing when history is empty', () => {
            const result = router.back();
            expect(result).toBe('landing');
            expect(router.getCurrentScreen()).toBe('landing');
        });

        it('updates body class on back navigation', () => {
            router.navigate('modeSelector');
            router.back();

            expect(document.body.classList.contains('screen-landing')).toBe(true);
            expect(document.body.classList.contains('screen-modeSelector')).toBe(false);
        });

        it('restores landing-mode class when going back to landing', () => {
            router.navigate('modeSelector');
            router.back();

            expect(document.body.classList.contains('landing-mode')).toBe(true);
        });

        it('dispatches app:navigate event with isBack flag', () => {
            router.navigate('modeSelector');

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
            router.navigate('modeSelector');
            router.navigate('parametrization');
            router.reset('landing');

            expect(router.getCurrentScreen()).toBe('landing');
            expect(router.canGoBack()).toBe(false);
        });

        it('defaults to landing when no screen is specified', () => {
            router.navigate('game');
            router.reset();

            expect(router.getCurrentScreen()).toBe('landing');
        });

        it('updates body class correctly', () => {
            router.navigate('game');
            router.reset('landing');

            expect(document.body.classList.contains('screen-landing')).toBe(true);
            expect(document.body.classList.contains('screen-game')).toBe(false);
        });

        it('dispatches app:navigate event with isReset flag', () => {
            const handler = vi.fn();
            document.addEventListener('app:navigate', handler);

            router.navigate('game');
            router.reset('landing');

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
            warnSpy.mockRestore();
        });
    });

    describe('canGoBack()', () => {
        it('returns false when history is empty', () => {
            expect(router.canGoBack()).toBe(false);
        });

        it('returns true after a navigation', () => {
            router.navigate('modeSelector');
            expect(router.canGoBack()).toBe(true);
        });

        it('returns false after navigating back to the start', () => {
            router.navigate('modeSelector');
            router.back();
            expect(router.canGoBack()).toBe(false);
        });
    });

    describe('body class management', () => {
        it('only has one screen class at a time', () => {
            router.navigate('modeSelector');
            router.navigate('parametrization');

            const screenClasses = AppRouter.SCREENS
                .map(s => `screen-${s}`)
                .filter(cls => document.body.classList.contains(cls));

            expect(screenClasses).toHaveLength(1);
            expect(screenClasses[0]).toBe('screen-parametrization');
        });
    });

    describe('container visibility', () => {
        it('handles missing containers gracefully', () => {
            // Remove a container from the DOM
            document.getElementById('modeSelectorScreen').remove();

            // Re-create router with missing container
            const router2 = new AppRouter();
            expect(() => router2.navigate('modeSelector')).not.toThrow();
        });
    });
});
