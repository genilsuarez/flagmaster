import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StreakIndicatorView } from './StreakIndicatorView.js';

describe('StreakIndicatorView', () => {
    let container;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('renders a streak-indicator element with role="status"', () => {
        new StreakIndicatorView({ container });
        const indicator = container.querySelector('.streak-indicator');
        expect(indicator).not.toBeNull();
        expect(indicator.getAttribute('role')).toBe('status');
    });

    it('starts with streak-indicator--none class', () => {
        new StreakIndicatorView({ container });
        const indicator = container.querySelector('.streak-indicator');
        expect(indicator.classList.contains('streak-indicator--none')).toBe(true);
    });

    it('displays empty text when tier is none', () => {
        const view = new StreakIndicatorView({ container });
        view.update('none', 0, 1.0);
        const display = container.querySelector('.streak-indicator__display');
        expect(display.textContent).toBe('');
    });

    it('displays streak count and multiplier for gold tier', () => {
        const view = new StreakIndicatorView({ container });
        view.update('gold', 3, 1.5);
        const display = container.querySelector('.streak-indicator__display');
        expect(display.textContent).toBe('⭐ 3 × 1.5');
    });

    it('displays streak count and multiplier for fire tier', () => {
        const view = new StreakIndicatorView({ container });
        view.update('fire', 5, 2.0);
        const display = container.querySelector('.streak-indicator__display');
        expect(display.textContent).toBe('🔥 5 × 2.0');
    });

    it('displays streak count and multiplier for pulse tier', () => {
        const view = new StreakIndicatorView({ container });
        view.update('pulse', 8, 3.0);
        const display = container.querySelector('.streak-indicator__display');
        expect(display.textContent).toBe('💫 8 × 3.0');
    });

    it('displays streak count and multiplier for aurora tier', () => {
        const view = new StreakIndicatorView({ container });
        view.update('aurora', 12, 5.0);
        const display = container.querySelector('.streak-indicator__display');
        expect(display.textContent).toBe('✨ 12 × 5.0');
    });

    it('applies the correct tier CSS class on update', () => {
        const view = new StreakIndicatorView({ container });
        view.update('fire', 5, 2.0);
        const indicator = container.querySelector('.streak-indicator');
        expect(indicator.classList.contains('streak-indicator--fire')).toBe(true);
        expect(indicator.classList.contains('streak-indicator--none')).toBe(false);
    });

    it('removes previous tier class when transitioning to a new tier', () => {
        const view = new StreakIndicatorView({ container });
        view.update('gold', 3, 1.5);
        view.update('fire', 5, 2.0);
        const indicator = container.querySelector('.streak-indicator');
        expect(indicator.classList.contains('streak-indicator--fire')).toBe(true);
        expect(indicator.classList.contains('streak-indicator--gold')).toBe(false);
    });

    it('announces tier change via aria-live region', () => {
        const view = new StreakIndicatorView({ container });
        view.update('fire', 5, 2.0);
        const announcer = container.querySelector('[aria-live="polite"]');
        expect(announcer.textContent).toBe('Racha: 5, multiplicador ×2.0, nivel fuego');
    });

    it('announces "Racha perdida" when tier changes to none', () => {
        const view = new StreakIndicatorView({ container });
        view.update('gold', 3, 1.5);
        view.update('none', 0, 1.0);
        const announcer = container.querySelector('[aria-live="polite"]');
        expect(announcer.textContent).toBe('Racha perdida');
    });

    it('does not announce when tier stays the same', () => {
        const view = new StreakIndicatorView({ container });
        view.update('gold', 3, 1.5);
        const announcer = container.querySelector('[aria-live="polite"]');
        const firstAnnouncement = announcer.textContent;

        // Update with same tier but different count
        view.update('gold', 4, 1.5);
        expect(announcer.textContent).toBe(firstAnnouncement);
    });

    it('reset() sets indicator back to none state', () => {
        const view = new StreakIndicatorView({ container });
        view.update('aurora', 12, 5.0);
        view.reset();
        const indicator = container.querySelector('.streak-indicator');
        const display = container.querySelector('.streak-indicator__display');
        expect(indicator.classList.contains('streak-indicator--none')).toBe(true);
        expect(display.textContent).toBe('');
    });

    it('destroy() cleans up the container', () => {
        const view = new StreakIndicatorView({ container });
        expect(container.children.length).toBeGreaterThan(0);
        view.destroy();
        expect(container.innerHTML).toBe('');
    });

    it('has aria-label on the indicator element', () => {
        new StreakIndicatorView({ container });
        const indicator = container.querySelector('.streak-indicator');
        expect(indicator.getAttribute('aria-label')).toBe('Indicador de racha');
    });

    it('announcer has aria-atomic="true"', () => {
        new StreakIndicatorView({ container });
        const announcer = container.querySelector('[aria-live="polite"]');
        expect(announcer.getAttribute('aria-atomic')).toBe('true');
    });
});
