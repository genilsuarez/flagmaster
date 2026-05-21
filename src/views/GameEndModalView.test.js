import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameEndModalView } from './GameEndModalView.js';

describe('GameEndModalView', () => {
    let view;
    let onPlayAgain;
    let onHome;

    beforeEach(() => {
        onPlayAgain = vi.fn();
        onHome = vi.fn();
        view = new GameEndModalView({ onPlayAgain, onHome });
    });

    afterEach(() => {
        view.destroy();
    });

    describe('team results layout', () => {
        const teamOptions = {
            modeId: 'banderaFlash',
            teamScores: { red: 5, blue: 3, green: 2 },
            newAchievements: [],
        };

        it('renders a modal overlay with correct CSS classes', () => {
            view.showTeamResults(teamOptions);
            const modal = document.querySelector('.game-end-modal');
            expect(modal).not.toBeNull();
            expect(modal.classList.contains('game-end-modal__overlay')).toBe(true);
        });

        it('sets role="dialog" and aria-modal="true"', () => {
            view.showTeamResults(teamOptions);
            const modal = document.querySelector('.game-end-modal');
            expect(modal.getAttribute('role')).toBe('dialog');
            expect(modal.getAttribute('aria-modal')).toBe('true');
        });

        it('displays the game-end-modal__content container', () => {
            view.showTeamResults(teamOptions);
            const content = document.querySelector('.game-end-modal__content');
            expect(content).not.toBeNull();
        });

        it('displays team scores in the stats section', () => {
            view.showTeamResults(teamOptions);
            const stats = document.querySelector('.game-end-modal__stats');
            expect(stats).not.toBeNull();
            const scoreItems = document.querySelectorAll('.game-end-modal__score-item');
            expect(scoreItems.length).toBe(3);
        });

        it('shows the winner announcement for the team with highest score', () => {
            view.showTeamResults(teamOptions);
            const winner = document.querySelector('.game-end-modal__winner');
            expect(winner.textContent).toContain('Equipo Rojo');
            expect(winner.textContent).toContain('Gana');
        });

        it('shows tie announcement when multiple teams have the same score', () => {
            view.showTeamResults({
                ...teamOptions,
                teamScores: { red: 4, blue: 4, green: 2 },
            });
            const winner = document.querySelector('.game-end-modal__winner');
            expect(winner.textContent).toContain('Empate');
        });

        it('displays each team name and score', () => {
            view.showTeamResults(teamOptions);
            const names = document.querySelectorAll('.game-end-modal__team-name');
            const scores = document.querySelectorAll('.game-end-modal__team-score');
            expect(names[0].textContent).toBe('Equipo Rojo');
            expect(scores[0].textContent).toBe('5');
            expect(names[1].textContent).toBe('Equipo Azul');
            expect(scores[1].textContent).toBe('3');
        });
    });

    describe('individual results layout', () => {
        const individualOptions = {
            modeId: 'flagRush',
            totalScore: 4500,
            correct: 8,
            wrong: 2,
            maxStreak: 5,
            elapsedSeconds: 95,
            newAchievements: [],
        };

        it('renders a modal overlay with correct CSS classes', () => {
            view.showIndividualResults(individualOptions);
            const modal = document.querySelector('.game-end-modal');
            expect(modal).not.toBeNull();
            expect(modal.classList.contains('game-end-modal__overlay')).toBe(true);
        });

        it('displays the stats section with individual stats', () => {
            view.showIndividualResults(individualOptions);
            const stats = document.querySelector('.game-end-modal__stats');
            expect(stats).not.toBeNull();
            const rows = document.querySelectorAll('.game-end-modal__stat-row');
            expect(rows.length).toBe(5);
        });

        it('shows total score, correct, wrong, streak, and time', () => {
            view.showIndividualResults(individualOptions);
            const values = document.querySelectorAll('.game-end-modal__stat-value');
            expect(values[0].textContent).toBe('4,500');
            expect(values[1].textContent).toBe('8');
            expect(values[2].textContent).toBe('2');
            expect(values[3].textContent).toBe('5');
            expect(values[4].textContent).toBe('01:35');
        });

        it('formats time as MM:SS', () => {
            view.showIndividualResults({ ...individualOptions, elapsedSeconds: 3661 });
            const values = document.querySelectorAll('.game-end-modal__stat-value');
            expect(values[4].textContent).toBe('61:01');
        });
    });

    describe('achievements section', () => {
        it('does not render achievements section when no achievements unlocked', () => {
            view.showIndividualResults({
                modeId: 'flagRush',
                totalScore: 1000,
                correct: 5,
                wrong: 5,
                maxStreak: 3,
                elapsedSeconds: 60,
                newAchievements: [],
            });
            const achievements = document.querySelector('.game-end-modal__achievements');
            expect(achievements).toBeNull();
        });

        it('renders achievements section when achievements are unlocked', () => {
            view.showIndividualResults({
                modeId: 'flagRush',
                totalScore: 1000,
                correct: 5,
                wrong: 5,
                maxStreak: 3,
                elapsedSeconds: 60,
                newAchievements: ['explorer', 'imparable'],
            });
            const achievements = document.querySelector('.game-end-modal__achievements');
            expect(achievements).not.toBeNull();
        });

        it('displays achievement icons and names', () => {
            view.showIndividualResults({
                modeId: 'flagRush',
                totalScore: 1000,
                correct: 5,
                wrong: 5,
                maxStreak: 3,
                elapsedSeconds: 60,
                newAchievements: ['explorer'],
            });
            const icon = document.querySelector('.game-end-modal__achievement-icon');
            const name = document.querySelector('.game-end-modal__achievement-name');
            expect(icon.textContent).toBe('🌍');
            expect(name.textContent).toBe('Explorador');
        });

        it('renders multiple achievements', () => {
            view.showTeamResults({
                modeId: 'banderaFlash',
                teamScores: { red: 3, blue: 2, green: 1 },
                newAchievements: ['explorer', 'sniper', 'lightning'],
            });
            const items = document.querySelectorAll('.game-end-modal__achievement-item');
            expect(items.length).toBe(3);
        });
    });

    describe('buttons', () => {
        it('renders Jugar de nuevo and Inicio buttons', () => {
            view.showIndividualResults({
                modeId: 'flagRush',
                totalScore: 1000,
                correct: 5,
                wrong: 5,
                maxStreak: 3,
                elapsedSeconds: 60,
                newAchievements: [],
            });
            const buttons = document.querySelectorAll('.game-end-modal__btn');
            expect(buttons.length).toBe(2);
            expect(buttons[0].textContent).toBe('Jugar de nuevo');
            expect(buttons[1].textContent).toBe('Inicio');
        });

        it('calls onPlayAgain with the mode id when Jugar de nuevo is clicked', () => {
            view.showIndividualResults({
                modeId: 'streakBlitz',
                totalScore: 1000,
                correct: 5,
                wrong: 5,
                maxStreak: 3,
                elapsedSeconds: 60,
                newAchievements: [],
            });
            const playAgainBtn = document.querySelector('.game-end-modal__btn--play-again');
            playAgainBtn.click();
            expect(onPlayAgain).toHaveBeenCalledWith('streakBlitz');
        });

        it('calls onHome when Inicio is clicked', () => {
            view.showIndividualResults({
                modeId: 'flagRush',
                totalScore: 1000,
                correct: 5,
                wrong: 5,
                maxStreak: 3,
                elapsedSeconds: 60,
                newAchievements: [],
            });
            const homeBtn = document.querySelector('.game-end-modal__btn--home');
            homeBtn.click();
            expect(onHome).toHaveBeenCalled();
        });

        it('closes the modal after Jugar de nuevo is clicked', () => {
            view.showIndividualResults({
                modeId: 'flagRush',
                totalScore: 1000,
                correct: 5,
                wrong: 5,
                maxStreak: 3,
                elapsedSeconds: 60,
                newAchievements: [],
            });
            const playAgainBtn = document.querySelector('.game-end-modal__btn--play-again');
            playAgainBtn.click();
            const modal = document.querySelector('.game-end-modal');
            expect(modal).toBeNull();
        });

        it('closes the modal after Inicio is clicked', () => {
            view.showIndividualResults({
                modeId: 'flagRush',
                totalScore: 1000,
                correct: 5,
                wrong: 5,
                maxStreak: 3,
                elapsedSeconds: 60,
                newAchievements: [],
            });
            const homeBtn = document.querySelector('.game-end-modal__btn--home');
            homeBtn.click();
            const modal = document.querySelector('.game-end-modal');
            expect(modal).toBeNull();
        });
    });

    describe('accessibility', () => {
        it('has aria-label on the modal', () => {
            view.showIndividualResults({
                modeId: 'flagRush',
                totalScore: 1000,
                correct: 5,
                wrong: 5,
                maxStreak: 3,
                elapsedSeconds: 60,
                newAchievements: [],
            });
            const modal = document.querySelector('.game-end-modal');
            expect(modal.getAttribute('aria-label')).toBe('Resultados del juego');
        });

        it('focuses the first button on open', () => {
            view.showIndividualResults({
                modeId: 'flagRush',
                totalScore: 1000,
                correct: 5,
                wrong: 5,
                maxStreak: 3,
                elapsedSeconds: 60,
                newAchievements: [],
            });
            const firstBtn = document.querySelector('.game-end-modal__btn');
            expect(document.activeElement).toBe(firstBtn);
        });

        it('closes modal on Escape key', () => {
            view.showIndividualResults({
                modeId: 'flagRush',
                totalScore: 1000,
                correct: 5,
                wrong: 5,
                maxStreak: 3,
                elapsedSeconds: 60,
                newAchievements: [],
            });
            const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
            document.dispatchEvent(event);
            const modal = document.querySelector('.game-end-modal');
            expect(modal).toBeNull();
        });

        it('calls onHome when Escape is pressed', () => {
            view.showIndividualResults({
                modeId: 'flagRush',
                totalScore: 1000,
                correct: 5,
                wrong: 5,
                maxStreak: 3,
                elapsedSeconds: 60,
                newAchievements: [],
            });
            const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
            document.dispatchEvent(event);
            expect(onHome).toHaveBeenCalled();
        });

        it('traps focus within the modal on Tab', () => {
            view.showIndividualResults({
                modeId: 'flagRush',
                totalScore: 1000,
                correct: 5,
                wrong: 5,
                maxStreak: 3,
                elapsedSeconds: 60,
                newAchievements: [],
            });
            const buttons = document.querySelectorAll('.game-end-modal__btn');
            const lastBtn = buttons[buttons.length - 1];
            lastBtn.focus();

            const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
            document.dispatchEvent(event);
            // Focus should wrap to first button
            expect(document.activeElement).toBe(buttons[0]);
        });

        it('traps focus within the modal on Shift+Tab', () => {
            view.showIndividualResults({
                modeId: 'flagRush',
                totalScore: 1000,
                correct: 5,
                wrong: 5,
                maxStreak: 3,
                elapsedSeconds: 60,
                newAchievements: [],
            });
            const buttons = document.querySelectorAll('.game-end-modal__btn');
            const firstBtn = buttons[0];
            firstBtn.focus();

            const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true });
            document.dispatchEvent(event);
            // Focus should wrap to last button
            expect(document.activeElement).toBe(buttons[buttons.length - 1]);
        });
    });

    describe('close and destroy', () => {
        it('close() removes the modal from the DOM', () => {
            view.showIndividualResults({
                modeId: 'flagRush',
                totalScore: 1000,
                correct: 5,
                wrong: 5,
                maxStreak: 3,
                elapsedSeconds: 60,
                newAchievements: [],
            });
            view.close();
            const modal = document.querySelector('.game-end-modal');
            expect(modal).toBeNull();
        });

        it('destroy() removes the modal and cleans up', () => {
            view.showIndividualResults({
                modeId: 'flagRush',
                totalScore: 1000,
                correct: 5,
                wrong: 5,
                maxStreak: 3,
                elapsedSeconds: 60,
                newAchievements: [],
            });
            view.destroy();
            const modal = document.querySelector('.game-end-modal');
            expect(modal).toBeNull();
        });

        it('showing a new modal replaces the previous one', () => {
            view.showIndividualResults({
                modeId: 'flagRush',
                totalScore: 1000,
                correct: 5,
                wrong: 5,
                maxStreak: 3,
                elapsedSeconds: 60,
                newAchievements: [],
            });
            view.showTeamResults({
                modeId: 'banderaFlash',
                teamScores: { red: 3, blue: 2, green: 1 },
                newAchievements: [],
            });
            const modals = document.querySelectorAll('.game-end-modal');
            expect(modals.length).toBe(1);
        });
    });
});
