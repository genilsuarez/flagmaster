import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModeSelectorView } from './ModeSelectorView.js';
import { GAME_MODES } from '../models/ModeDefinition.js';

describe('ModeSelectorView', () => {
    let container;
    let onSelect;

    beforeEach(() => {
        container = document.createElement('div');
        container.id = 'modeSelectorScreen';
        document.body.appendChild(container);
        onSelect = vi.fn();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('renders 8 mode cards', () => {
        new ModeSelectorView({ container, onSelect });
        const cards = container.querySelectorAll('[role="option"]');
        expect(cards.length).toBe(8);
    });

    it('renders a listbox container', () => {
        new ModeSelectorView({ container, onSelect });
        const listbox = container.querySelector('[role="listbox"]');
        expect(listbox).not.toBeNull();
        expect(listbox.getAttribute('aria-label')).toBe('Modos de juego disponibles');
    });

    it('each card shows icon, name, description, and category badge', () => {
        new ModeSelectorView({ container, onSelect });
        const firstCard = container.querySelector('[role="option"]');
        const icon = firstCard.querySelector('.mode-card__icon');
        const name = firstCard.querySelector('.mode-card__name');
        const description = firstCard.querySelector('.mode-card__description');
        const badge = firstCard.querySelector('.mode-card__badge');

        expect(icon.textContent).toBe('🏴');
        expect(name.textContent).toBe('Bandera Flash');
        expect(description.textContent).toBe('Adivina el país por su bandera');
        expect(badge.textContent).toBe('Equipos');
    });

    it('displays "Equipos" badge for team modes and "Individual" for individual modes', () => {
        new ModeSelectorView({ container, onSelect });
        const cards = container.querySelectorAll('[role="option"]');

        // First two modes are team modes
        expect(cards[0].querySelector('.mode-card__badge--team').textContent).toBe('Equipos');
        expect(cards[1].querySelector('.mode-card__badge--team').textContent).toBe('Equipos');

        // Third mode is individual
        expect(cards[2].querySelector('.mode-card__badge--individual').textContent).toBe('Individual');
    });

    it('calls onSelect with mode id when a card is clicked', () => {
        new ModeSelectorView({ container, onSelect });
        const cards = container.querySelectorAll('[role="option"]');
        cards[3].click();
        expect(onSelect).toHaveBeenCalledWith('flagRush');
    });

    it('supports Enter key to select the focused card', () => {
        const view = new ModeSelectorView({ container, onSelect });
        const grid = container.querySelector('[role="listbox"]');

        // Focus the third card
        view._setFocusedCard(2);

        const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        grid.dispatchEvent(event);

        expect(onSelect).toHaveBeenCalledWith('letrasEnCaida');
    });

    it('supports arrow key navigation (ArrowRight moves focus)', () => {
        const view = new ModeSelectorView({ container, onSelect });
        const grid = container.querySelector('[role="listbox"]');

        // Start at index 0
        expect(view.focusedIndex).toBe(0);

        const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
        grid.dispatchEvent(event);

        expect(view.focusedIndex).toBe(1);
        expect(view.cards[1].getAttribute('aria-selected')).toBe('true');
    });

    it('supports ArrowDown navigation (moves by column count)', () => {
        const view = new ModeSelectorView({ container, onSelect });
        const grid = container.querySelector('[role="listbox"]');

        // Mock desktop viewport (2 columns)
        vi.spyOn(view, '_getColumnCount').mockReturnValue(2);

        const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
        grid.dispatchEvent(event);

        expect(view.focusedIndex).toBe(2);
    });

    it('does not go below 0 with ArrowLeft at start', () => {
        const view = new ModeSelectorView({ container, onSelect });
        const grid = container.querySelector('[role="listbox"]');

        const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
        grid.dispatchEvent(event);

        expect(view.focusedIndex).toBe(0);
    });

    it('does not exceed max index with ArrowRight at end', () => {
        const view = new ModeSelectorView({ container, onSelect });
        const grid = container.querySelector('[role="listbox"]');

        view._setFocusedCard(7);
        const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
        grid.dispatchEvent(event);

        expect(view.focusedIndex).toBe(7);
    });

    it('Home key moves to first card', () => {
        const view = new ModeSelectorView({ container, onSelect });
        const grid = container.querySelector('[role="listbox"]');

        view._setFocusedCard(5);
        const event = new KeyboardEvent('keydown', { key: 'Home', bubbles: true });
        grid.dispatchEvent(event);

        expect(view.focusedIndex).toBe(0);
    });

    it('End key moves to last card', () => {
        const view = new ModeSelectorView({ container, onSelect });
        const grid = container.querySelector('[role="listbox"]');

        const event = new KeyboardEvent('keydown', { key: 'End', bubbles: true });
        grid.dispatchEvent(event);

        expect(view.focusedIndex).toBe(7);
    });

    it('sets aria-label on each card with mode name and category', () => {
        new ModeSelectorView({ container, onSelect });
        const cards = container.querySelectorAll('[role="option"]');
        expect(cards[0].getAttribute('aria-label')).toBe('Bandera Flash — Equipos');
        expect(cards[2].getAttribute('aria-label')).toBe('Letras en Caída — Individual');
    });

    it('renders all 8 modes with correct data-mode-id attributes', () => {
        new ModeSelectorView({ container, onSelect });
        const cards = container.querySelectorAll('[role="option"]');
        const modeIds = Array.from(cards).map(c => c.dataset.modeId);
        const expectedIds = Object.keys(GAME_MODES);
        expect(modeIds).toEqual(expectedIds);
    });

    it('destroy() cleans up the container', () => {
        const view = new ModeSelectorView({ container, onSelect });
        expect(container.children.length).toBeGreaterThan(0);
        view.destroy();
        expect(container.innerHTML).toBe('');
    });
});
