import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PowerUpInventoryView } from './PowerUpInventoryView.js';

describe('PowerUpInventoryView', () => {
    let container;
    let onActivate;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        onActivate = vi.fn();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('renders a powerup-inventory container with toolbar role', () => {
        new PowerUpInventoryView({ container, onActivate });
        const inventory = container.querySelector('.powerup-inventory');
        expect(inventory).not.toBeNull();
        expect(inventory.getAttribute('role')).toBe('toolbar');
        expect(inventory.getAttribute('aria-label')).toBe('Inventario de power-ups');
    });

    it('renders no buttons when inventory is empty', () => {
        const view = new PowerUpInventoryView({ container, onActivate });
        view.update([]);
        const buttons = container.querySelectorAll('.powerup-btn');
        expect(buttons.length).toBe(0);
    });

    it('renders up to 3 circular icon buttons for the inventory', () => {
        const view = new PowerUpInventoryView({ container, onActivate });
        view.update(['timeExtra', 'fiftyFifty', 'freeze']);
        const buttons = container.querySelectorAll('.powerup-btn');
        expect(buttons.length).toBe(3);
    });

    it('truncates inventory to 3 items if more are provided', () => {
        const view = new PowerUpInventoryView({ container, onActivate });
        view.update(['timeExtra', 'fiftyFifty', 'freeze', 'doublePoints']);
        const buttons = container.querySelectorAll('.powerup-btn');
        expect(buttons.length).toBe(3);
    });

    it('displays the correct icon for each power-up', () => {
        const view = new PowerUpInventoryView({ container, onActivate });
        view.update(['timeExtra', 'freeze']);
        const buttons = container.querySelectorAll('.powerup-btn');
        expect(buttons[0].textContent).toBe('🕐');
        expect(buttons[1].textContent).toBe('❄️');
    });

    it('sets aria-label on each button with the power-up name', () => {
        const view = new PowerUpInventoryView({ container, onActivate });
        view.update(['timeExtra', 'fiftyFifty']);
        const buttons = container.querySelectorAll('.powerup-btn');
        expect(buttons[0].getAttribute('aria-label')).toBe('Tiempo Extra');
        expect(buttons[1].getAttribute('aria-label')).toBe('50/50');
    });

    it('sets title attribute (tooltip) on each button with the power-up name', () => {
        const view = new PowerUpInventoryView({ container, onActivate });
        view.update(['freeze', 'doublePoints']);
        const buttons = container.querySelectorAll('.powerup-btn');
        expect(buttons[0].getAttribute('title')).toBe('Congelar');
        expect(buttons[1].getAttribute('title')).toBe('Doble Puntos');
    });

    it('calls onActivate with the power-up id when a button is clicked', () => {
        const view = new PowerUpInventoryView({ container, onActivate });
        view.update(['timeExtra', 'freeze']);
        const buttons = container.querySelectorAll('.powerup-btn');
        buttons[1].click();
        expect(onActivate).toHaveBeenCalledWith('freeze');
    });

    it('disables all buttons after one activation (1 per round limit)', () => {
        const view = new PowerUpInventoryView({ container, onActivate });
        view.update(['timeExtra', 'fiftyFifty', 'freeze']);

        const buttons = container.querySelectorAll('.powerup-btn');
        buttons[0].click();

        // After activation, all buttons should be disabled
        const updatedButtons = container.querySelectorAll('.powerup-btn');
        for (const btn of updatedButtons) {
            expect(btn.disabled).toBe(true);
            expect(btn.classList.contains('powerup-btn--used')).toBe(true);
        }
    });

    it('does not call onActivate a second time after already used this round', () => {
        const view = new PowerUpInventoryView({ container, onActivate });
        view.update(['timeExtra', 'fiftyFifty']);

        const buttons = container.querySelectorAll('.powerup-btn');
        buttons[0].click();
        buttons[1].click(); // Should be ignored

        expect(onActivate).toHaveBeenCalledTimes(1);
        expect(onActivate).toHaveBeenCalledWith('timeExtra');
    });

    it('resetRound() re-enables buttons for the next round', () => {
        const view = new PowerUpInventoryView({ container, onActivate });
        view.update(['timeExtra', 'freeze']);

        // Use a power-up
        container.querySelector('.powerup-btn').click();

        // Reset for next round
        view.resetRound();

        const buttons = container.querySelectorAll('.powerup-btn');
        for (const btn of buttons) {
            expect(btn.disabled).toBe(false);
            expect(btn.classList.contains('powerup-btn--used')).toBe(false);
        }
    });

    it('after resetRound(), onActivate can be called again', () => {
        const view = new PowerUpInventoryView({ container, onActivate });
        view.update(['timeExtra', 'freeze']);

        container.querySelector('.powerup-btn').click();
        view.resetRound();

        const buttons = container.querySelectorAll('.powerup-btn');
        buttons[1].click();

        expect(onActivate).toHaveBeenCalledTimes(2);
        expect(onActivate).toHaveBeenLastCalledWith('freeze');
    });

    it('skips invalid power-up type ids gracefully', () => {
        const view = new PowerUpInventoryView({ container, onActivate });
        view.update(['timeExtra', 'invalidType', 'freeze']);
        const buttons = container.querySelectorAll('.powerup-btn');
        expect(buttons.length).toBe(2);
    });

    it('destroy() cleans up the container', () => {
        const view = new PowerUpInventoryView({ container, onActivate });
        view.update(['timeExtra']);
        expect(container.children.length).toBeGreaterThan(0);
        view.destroy();
        expect(container.innerHTML).toBe('');
    });
});
