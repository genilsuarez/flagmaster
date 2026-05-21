import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimerView } from './TimerView.js';

describe('TimerView', () => {
    let container;
    let onExpired;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        onExpired = vi.fn();
        vi.useFakeTimers();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.useRealTimers();
    });

    describe('rendering', () => {
        it('renders a timer-bar container with timer-bar__fill inside', () => {
            new TimerView({ container, onExpired });
            const bar = container.querySelector('.timer-bar');
            const fill = container.querySelector('.timer-bar__fill');
            expect(bar).not.toBeNull();
            expect(fill).not.toBeNull();
            expect(fill.parentElement).toBe(bar);
        });

        it('sets role="timer" and aria-label on the bar', () => {
            new TimerView({ container, onExpired });
            const bar = container.querySelector('.timer-bar');
            expect(bar.getAttribute('role')).toBe('timer');
            expect(bar.getAttribute('aria-label')).toBe('Tiempo restante');
        });

        it('renders an aria-live announcer element', () => {
            new TimerView({ container, onExpired });
            const announcer = container.querySelector('[aria-live="polite"]');
            expect(announcer).not.toBeNull();
            expect(announcer.getAttribute('aria-atomic')).toBe('true');
        });

        it('fill starts at 100% width', () => {
            new TimerView({ container, onExpired });
            const fill = container.querySelector('.timer-bar__fill');
            expect(fill.style.width).toBe('100%');
        });
    });

    describe('start()', () => {
        it('sets the timer running', () => {
            const timer = new TimerView({ container, onExpired });
            timer.start(10);
            expect(timer.getTotal()).toBe(10);
            expect(timer.getRemaining()).toBeCloseTo(10, 0);
        });

        it('resets frozen state on start', () => {
            const timer = new TimerView({ container, onExpired });
            timer.start(10);
            timer.freeze();
            expect(timer.isFrozen()).toBe(true);
            timer.start(10);
            expect(timer.isFrozen()).toBe(false);
        });
    });

    describe('getRemaining()', () => {
        it('decreases over time', () => {
            const timer = new TimerView({ container, onExpired });
            timer.start(10);

            vi.advanceTimersByTime(3000);
            expect(timer.getRemaining()).toBeCloseTo(7, 0);
        });

        it('never goes below 0', () => {
            const timer = new TimerView({ container, onExpired });
            timer.start(5);

            vi.advanceTimersByTime(10000);
            expect(timer.getRemaining()).toBe(0);
        });
    });

    describe('addTime()', () => {
        it('increases remaining time', () => {
            const timer = new TimerView({ container, onExpired });
            timer.start(10);

            vi.advanceTimersByTime(3000);
            timer.addTime(5);

            // Was at ~7s, added 5s = ~12s remaining
            expect(timer.getRemaining()).toBeCloseTo(12, 0);
        });

        it('increases total time', () => {
            const timer = new TimerView({ container, onExpired });
            timer.start(10);
            timer.addTime(5);
            expect(timer.getTotal()).toBe(15);
        });

        it('does nothing if timer is not running', () => {
            const timer = new TimerView({ container, onExpired });
            timer.addTime(5);
            expect(timer.getTotal()).toBe(0);
        });
    });

    describe('freeze()', () => {
        it('stops the countdown', () => {
            const timer = new TimerView({ container, onExpired });
            timer.start(10);

            vi.advanceTimersByTime(2000);
            timer.freeze();

            const remainingAtFreeze = timer.getRemaining();
            vi.advanceTimersByTime(5000);

            expect(timer.getRemaining()).toBeCloseTo(remainingAtFreeze, 1);
        });

        it('adds timer-bar--frozen class', () => {
            const timer = new TimerView({ container, onExpired });
            timer.start(10);
            timer.freeze();

            const bar = container.querySelector('.timer-bar');
            expect(bar.classList.contains('timer-bar--frozen')).toBe(true);
        });

        it('sets isFrozen() to true', () => {
            const timer = new TimerView({ container, onExpired });
            timer.start(10);
            timer.freeze();
            expect(timer.isFrozen()).toBe(true);
        });

        it('does nothing if already frozen', () => {
            const timer = new TimerView({ container, onExpired });
            timer.start(10);
            vi.advanceTimersByTime(2000);
            timer.freeze();
            const remaining = timer.getRemaining();
            timer.freeze(); // second call
            expect(timer.getRemaining()).toBeCloseTo(remaining, 1);
        });
    });

    describe('resume()', () => {
        it('resumes countdown after freeze', () => {
            const timer = new TimerView({ container, onExpired });
            timer.start(10);

            vi.advanceTimersByTime(2000);
            timer.freeze();
            const frozenRemaining = timer.getRemaining();

            vi.advanceTimersByTime(3000); // time passes while frozen
            timer.resume();

            vi.advanceTimersByTime(1000);
            // Should have decreased by ~1s from the frozen value
            expect(timer.getRemaining()).toBeCloseTo(frozenRemaining - 1, 0);
        });

        it('removes timer-bar--frozen class', () => {
            const timer = new TimerView({ container, onExpired });
            timer.start(10);
            timer.freeze();
            timer.resume();

            const bar = container.querySelector('.timer-bar');
            expect(bar.classList.contains('timer-bar--frozen')).toBe(false);
        });

        it('sets isFrozen() to false', () => {
            const timer = new TimerView({ container, onExpired });
            timer.start(10);
            timer.freeze();
            timer.resume();
            expect(timer.isFrozen()).toBe(false);
        });
    });

    describe('onExpired callback', () => {
        it('calls onExpired when timer reaches 0', () => {
            const timer = new TimerView({ container, onExpired });
            timer.start(5);

            // Advance past the total time and trigger rAF
            vi.advanceTimersByTime(5100);
            vi.runAllTimers();

            expect(onExpired).toHaveBeenCalledTimes(1);
        });

        it('does not call onExpired when stopped manually', () => {
            const timer = new TimerView({ container, onExpired });
            timer.start(5);
            timer.stop();

            vi.advanceTimersByTime(6000);
            vi.runAllTimers();

            expect(onExpired).not.toHaveBeenCalled();
        });
    });

    describe('aria-live announcements', () => {
        it('announces at 5 seconds remaining', () => {
            const timer = new TimerView({ container, onExpired });
            timer.start(10);

            // Advance to 5.5s elapsed (4.5s remaining) — triggers 5s announcement
            vi.advanceTimersByTime(5500);

            const announcer = container.querySelector('[aria-live="polite"]');
            expect(announcer.textContent).toBe('5 segundos restantes');
        });

        it('announces at 3 seconds remaining', () => {
            const timer = new TimerView({ container, onExpired });
            timer.start(10);

            // Advance to just past the 3s mark (3s remaining)
            vi.advanceTimersByTime(7100);
            vi.runAllTimers();

            const announcer = container.querySelector('[aria-live="polite"]');
            expect(announcer.textContent).toBe('3 segundos restantes');
        });
    });

    describe('color transition', () => {
        it('fill starts with sage-like color at full time', () => {
            const timer = new TimerView({ container, onExpired });
            timer.start(10);

            // Trigger first tick
            vi.advanceTimersByTime(16); // one frame
            vi.runAllTimers();

            const fill = container.querySelector('.timer-bar__fill');
            // At ~100% progress, color should be close to sage rgb(107, 154, 112)
            expect(fill.style.backgroundColor).toMatch(/rgb\(/);
        });
    });

    describe('stop()', () => {
        it('stops the timer without triggering onExpired', () => {
            const timer = new TimerView({ container, onExpired });
            timer.start(10);
            timer.stop();

            vi.advanceTimersByTime(15000);
            vi.runAllTimers();

            expect(onExpired).not.toHaveBeenCalled();
        });

        it('resets frozen state', () => {
            const timer = new TimerView({ container, onExpired });
            timer.start(10);
            timer.freeze();
            timer.stop();
            expect(timer.isFrozen()).toBe(false);
        });
    });

    describe('destroy()', () => {
        it('cleans up the container', () => {
            const timer = new TimerView({ container, onExpired });
            expect(container.children.length).toBeGreaterThan(0);
            timer.destroy();
            expect(container.innerHTML).toBe('');
        });

        it('stops the timer', () => {
            const timer = new TimerView({ container, onExpired });
            timer.start(5);
            timer.destroy();

            vi.advanceTimersByTime(6000);
            vi.runAllTimers();

            expect(onExpired).not.toHaveBeenCalled();
        });
    });

    describe('onExpired setter', () => {
        it('allows changing the callback after construction', () => {
            const timer = new TimerView({ container });
            const newCallback = vi.fn();
            timer.onExpired = newCallback;
            timer.start(2);

            vi.advanceTimersByTime(2100);
            vi.runAllTimers();

            expect(newCallback).toHaveBeenCalledTimes(1);
        });
    });
});
