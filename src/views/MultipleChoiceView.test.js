import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MultipleChoiceView } from './MultipleChoiceView.js';

describe('MultipleChoiceView', () => {
    let container;
    let view;

    const mockOptions = [
        { text: 'France', correct: true },
        { text: 'Germany', correct: false },
        { text: 'Spain', correct: false },
        { text: 'Italy', correct: false },
    ];

    beforeEach(() => {
        vi.useFakeTimers();
        container = document.createElement('div');
        document.body.appendChild(container);
        view = new MultipleChoiceView({ container });
    });

    afterEach(() => {
        view.destroy();
        document.body.removeChild(container);
        vi.useRealTimers();
    });

    describe('render', () => {
        it('renders a grid container with mc-grid class', () => {
            view.render(mockOptions, vi.fn());
            const grid = container.querySelector('.mc-grid');
            expect(grid).not.toBeNull();
        });

        it('renders 4 buttons with mc-option class', () => {
            view.render(mockOptions, vi.fn());
            const buttons = container.querySelectorAll('.mc-option');
            expect(buttons).toHaveLength(4);
        });

        it('displays option text on each button', () => {
            view.render(mockOptions, vi.fn());
            const buttons = container.querySelectorAll('.mc-option');
            expect(buttons[0].textContent).toBe('France');
            expect(buttons[1].textContent).toBe('Germany');
            expect(buttons[2].textContent).toBe('Spain');
            expect(buttons[3].textContent).toBe('Italy');
        });

        it('sets aria-label on the grid container', () => {
            view.render(mockOptions, vi.fn());
            const grid = container.querySelector('.mc-grid');
            expect(grid.getAttribute('role')).toBe('group');
            expect(grid.getAttribute('aria-label')).toBe('Opciones de respuesta');
        });

        it('clears previous content on re-render', () => {
            view.render(mockOptions, vi.fn());
            view.render(mockOptions, vi.fn());
            const grids = container.querySelectorAll('.mc-grid');
            expect(grids).toHaveLength(1);
        });
    });

    describe('selection feedback', () => {
        it('adds mc-option--correct class when correct option is selected', () => {
            view.render(mockOptions, vi.fn());
            const buttons = container.querySelectorAll('.mc-option');
            buttons[0].click(); // France is correct
            expect(buttons[0].classList.contains('mc-option--correct')).toBe(true);
        });

        it('adds mc-option--incorrect class when wrong option is selected', () => {
            view.render(mockOptions, vi.fn());
            const buttons = container.querySelectorAll('.mc-option');
            buttons[1].click(); // Germany is incorrect
            expect(buttons[1].classList.contains('mc-option--incorrect')).toBe(true);
        });

        it('highlights the correct answer when a wrong option is selected', () => {
            view.render(mockOptions, vi.fn());
            const buttons = container.querySelectorAll('.mc-option');
            buttons[2].click(); // Spain is incorrect
            expect(buttons[0].classList.contains('mc-option--correct')).toBe(true);
        });

        it('calls onSelect with index and isCorrect after 300ms delay', () => {
            const onSelect = vi.fn();
            view.render(mockOptions, onSelect);
            const buttons = container.querySelectorAll('.mc-option');
            buttons[0].click();

            // Not called immediately
            expect(onSelect).not.toHaveBeenCalled();

            // Called after delay
            vi.advanceTimersByTime(300);
            expect(onSelect).toHaveBeenCalledWith(0, true);
        });

        it('calls onSelect with false for incorrect selection', () => {
            const onSelect = vi.fn();
            view.render(mockOptions, onSelect);
            const buttons = container.querySelectorAll('.mc-option');
            buttons[3].click(); // Italy is incorrect

            vi.advanceTimersByTime(300);
            expect(onSelect).toHaveBeenCalledWith(3, false);
        });
    });

    describe('disable', () => {
        it('disables all buttons after selection (prevents double-clicks)', () => {
            view.render(mockOptions, vi.fn());
            const buttons = container.querySelectorAll('.mc-option');
            buttons[0].click();

            buttons.forEach(btn => {
                expect(btn.disabled).toBe(true);
            });
        });

        it('ignores clicks after disable() is called', () => {
            const onSelect = vi.fn();
            view.render(mockOptions, onSelect);
            const buttons = container.querySelectorAll('.mc-option');

            // First click
            buttons[0].click();
            vi.advanceTimersByTime(300);

            // Second click should be ignored
            buttons[1].click();
            vi.advanceTimersByTime(300);

            expect(onSelect).toHaveBeenCalledTimes(1);
        });

        it('disable() method disables all buttons programmatically', () => {
            view.render(mockOptions, vi.fn());
            view.disable();
            const buttons = container.querySelectorAll('.mc-option');
            buttons.forEach(btn => {
                expect(btn.disabled).toBe(true);
            });
        });
    });

    describe('disableOptions', () => {
        it('disables buttons at specified indices (50/50 power-up)', () => {
            view.render(mockOptions, vi.fn());
            view.disableOptions([1, 2]);

            const buttons = container.querySelectorAll('.mc-option');
            expect(buttons[0].disabled).toBe(false);
            expect(buttons[1].disabled).toBe(true);
            expect(buttons[2].disabled).toBe(true);
            expect(buttons[3].disabled).toBe(false);
        });

        it('adds mc-option--disabled class to disabled options', () => {
            view.render(mockOptions, vi.fn());
            view.disableOptions([1, 3]);

            const buttons = container.querySelectorAll('.mc-option');
            expect(buttons[1].classList.contains('mc-option--disabled')).toBe(true);
            expect(buttons[3].classList.contains('mc-option--disabled')).toBe(true);
            expect(buttons[0].classList.contains('mc-option--disabled')).toBe(false);
        });

        it('disabled options cannot be clicked', () => {
            const onSelect = vi.fn();
            view.render(mockOptions, onSelect);
            view.disableOptions([1]);

            const buttons = container.querySelectorAll('.mc-option');
            buttons[1].click();
            vi.advanceTimersByTime(300);

            expect(onSelect).not.toHaveBeenCalled();
        });
    });

    describe('destroy', () => {
        it('clears the container content', () => {
            view.render(mockOptions, vi.fn());
            view.destroy();
            expect(container.innerHTML).toBe('');
        });
    });
});
