import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SupervivenciaController } from './SupervivenciaController.js';

/**
 * Helper to create mock country objects matching the Country model shape.
 */
function makeCountry(name, continent, capital) {
    return {
        englishName: name,
        spanishName: name,
        displayName: name,
        continent,
        capital: capital || `${name} City`,
        flagUrl: `https://flagcdn.com/${name.toLowerCase().replace(/\s/g, '-')}.svg`,
        isSovereign: true,
    };
}

/**
 * Creates a pool of countries across multiple continents for testing.
 */
function createTestPool() {
    return [
        makeCountry('France', 'Europe', 'Paris'),
        makeCountry('Germany', 'Europe', 'Berlin'),
        makeCountry('Spain', 'Europe', 'Madrid'),
        makeCountry('Italy', 'Europe', 'Rome'),
        makeCountry('Portugal', 'Europe', 'Lisbon'),
        makeCountry('Brazil', 'America', 'Brasilia'),
        makeCountry('Argentina', 'America', 'Buenos Aires'),
        makeCountry('Japan', 'Asia', 'Tokyo'),
        makeCountry('China', 'Asia', 'Beijing'),
        makeCountry('India', 'Asia', 'New Delhi'),
        makeCountry('Australia', 'Oceania', 'Canberra'),
        makeCountry('Nigeria', 'Africa', 'Abuja'),
    ];
}

describe('SupervivenciaController', () => {
    let container;
    let controller;
    let pool;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        pool = createTestPool();
        vi.useFakeTimers();
    });

    afterEach(() => {
        if (controller) {
            controller.destroy();
            controller = null;
        }
        if (container && container.parentNode) {
            document.body.removeChild(container);
        }
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('initializes with default state', () => {
            controller = new SupervivenciaController({ container });
            expect(controller.isActive).toBe(false);
            expect(controller.totalScore).toBe(0);
            expect(controller.currentRound).toBe(0);
            expect(controller.lives).toBe(3);
        });

        it('accepts onRoundEnd and onGameEnd callbacks', () => {
            const onRoundEnd = vi.fn();
            const onGameEnd = vi.fn();
            controller = new SupervivenciaController({ container, onRoundEnd, onGameEnd });
            expect(controller.onRoundEnd).toBe(onRoundEnd);
            expect(controller.onGameEnd).toBe(onGameEnd);
        });
    });

    describe('start', () => {
        it('sets isActive to true', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            expect(controller.isActive).toBe(true);
        });

        it('initializes with 3 lives', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            expect(controller.lives).toBe(3);
        });

        it('uses default timePerQuestion of 15 seconds', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            expect(controller.timePerQuestion).toBe(15);
        });

        it('uses configurable timePerQuestion from modeOptions', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool, { timePerQuestion: 20 });
            expect(controller.timePerQuestion).toBe(20);
        });

        it('resets score and counters', () => {
            controller = new SupervivenciaController({ container });
            controller.totalScore = 500;
            controller.currentRound = 5;
            controller.lives = 1;
            controller.start(pool);
            expect(controller.totalScore).toBe(0);
            expect(controller.lives).toBe(3);
            expect(controller.currentRound).toBe(1); // nextRound increments to 1
        });

        it('renders the game UI into the container', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            expect(container.querySelector('.supervivencia-timer')).not.toBeNull();
            expect(container.querySelector('.supervivencia-options')).not.toBeNull();
            expect(container.querySelector('.supervivencia-lives')).not.toBeNull();
        });

        it('renders 4 multiple choice options', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            const buttons = container.querySelectorAll('.mc-option');
            expect(buttons.length).toBe(4);
        });

        it('does not mutate the original pool', () => {
            controller = new SupervivenciaController({ container });
            const originalPool = [...pool];
            controller.start(pool);
            expect(pool).toEqual(originalPool);
        });

        it('displays lives as hearts', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            const livesEl = container.querySelector('.supervivencia-lives');
            expect(livesEl.textContent).toBe('❤️❤️❤️');
        });
    });

    describe('lives system', () => {
        it('deducts a life on incorrect answer', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            controller.handleAnswer(0, false);
            expect(controller.lives).toBe(2);
        });

        it('deducts a life on timeout', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            controller.handleTimeout();
            expect(controller.lives).toBe(2); // starts at 3, loses 1 on timeout
        });

        it('does not deduct a life on correct answer', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(5);
            controller.handleAnswer(0, true);
            expect(controller.lives).toBe(3);
        });

        it('ends the game when lives reach 0', () => {
            const onGameEnd = vi.fn();
            controller = new SupervivenciaController({ container, onGameEnd });
            controller.start(pool);

            // Lose all 3 lives
            controller.handleAnswer(0, false); // 2 lives
            vi.advanceTimersByTime(SupervivenciaController.FEEDBACK_DELAY_MS);
            controller.handleAnswer(0, false); // 1 life
            vi.advanceTimersByTime(SupervivenciaController.FEEDBACK_DELAY_MS);
            controller.handleAnswer(0, false); // 0 lives

            // Wait for feedback delay before game ends
            vi.advanceTimersByTime(SupervivenciaController.FEEDBACK_DELAY_MS);

            expect(controller.isActive).toBe(false);
            expect(onGameEnd).toHaveBeenCalled();
        });

        it('updates lives display when a life is lost', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            controller.handleAnswer(0, false);
            const livesEl = container.querySelector('.supervivencia-lives');
            expect(livesEl.textContent).toBe('❤️❤️');
        });
    });

    describe('difficulty tiers', () => {
        it('returns 15s timer for rounds 1-10', () => {
            controller = new SupervivenciaController({ container });
            expect(controller.getDifficultyForRound(1).time).toBe(15);
            expect(controller.getDifficultyForRound(5).time).toBe(15);
            expect(controller.getDifficultyForRound(10).time).toBe(15);
        });

        it('returns 10s timer for rounds 11-20', () => {
            controller = new SupervivenciaController({ container });
            expect(controller.getDifficultyForRound(11).time).toBe(10);
            expect(controller.getDifficultyForRound(15).time).toBe(10);
            expect(controller.getDifficultyForRound(20).time).toBe(10);
        });

        it('returns 7s timer for rounds 21+', () => {
            controller = new SupervivenciaController({ container });
            expect(controller.getDifficultyForRound(21).time).toBe(7);
            expect(controller.getDifficultyForRound(50).time).toBe(7);
            expect(controller.getDifficultyForRound(100).time).toBe(7);
        });

        it('does not prefer same-continent distractors for rounds 1-10', () => {
            controller = new SupervivenciaController({ container });
            expect(controller.getDifficultyForRound(1).sameContinentDistractors).toBe(false);
            expect(controller.getDifficultyForRound(10).sameContinentDistractors).toBe(false);
        });

        it('does not prefer same-continent distractors for rounds 11-20', () => {
            controller = new SupervivenciaController({ container });
            expect(controller.getDifficultyForRound(11).sameContinentDistractors).toBe(false);
            expect(controller.getDifficultyForRound(20).sameContinentDistractors).toBe(false);
        });

        it('prefers same-continent distractors for rounds 21+', () => {
            controller = new SupervivenciaController({ container });
            expect(controller.getDifficultyForRound(21).sameContinentDistractors).toBe(true);
            expect(controller.getDifficultyForRound(50).sameContinentDistractors).toBe(true);
        });
    });

    describe('question type mixing', () => {
        it('assigns a question type (flag or capital) to each round', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            expect(['flag', 'capital']).toContain(controller.currentQuestionType);
        });

        it('shows flag image for flag questions', () => {
            controller = new SupervivenciaController({ container });
            vi.spyOn(Math, 'random').mockReturnValue(0.1); // < 0.5 → flag
            controller.start(pool);
            const flagEl = container.querySelector('.supervivencia-flag');
            const promptEl = container.querySelector('.supervivencia-prompt');
            expect(flagEl.style.display).not.toBe('none');
            expect(promptEl.style.display).toBe('none');
        });

        it('shows country name for capital questions', () => {
            controller = new SupervivenciaController({ container });
            vi.spyOn(Math, 'random').mockReturnValue(0.9); // >= 0.5 → capital
            controller.start(pool);
            const flagEl = container.querySelector('.supervivencia-flag');
            const promptEl = container.querySelector('.supervivencia-prompt');
            expect(flagEl.style.display).toBe('none');
            expect(promptEl.style.display).not.toBe('none');
        });

        it('enforces max 3 consecutive same type', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);

            controller.lastQuestionType = 'flag';
            controller.consecutiveSameType = 3;

            const nextType = controller.pickQuestionType();
            expect(nextType).toBe('capital');
        });

        it('forces opposite type after 3 consecutive', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);

            controller.lastQuestionType = 'capital';
            controller.consecutiveSameType = 3;

            const nextType = controller.pickQuestionType();
            expect(nextType).toBe('flag');
        });
    });

    describe('handleAnswer', () => {
        it('awards points for correct answers', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(5);
            controller.handleAnswer(0, true);
            expect(controller.totalScore).toBeGreaterThan(0);
        });

        it('awards zero points for incorrect answers', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            controller.handleAnswer(0, false);
            expect(controller.totalScore).toBe(0);
        });

        it('increments streak on correct answer', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(5);
            controller.handleAnswer(0, true);
            expect(controller.streakService.count).toBe(1);
        });

        it('resets streak on incorrect answer', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(5);
            controller.handleAnswer(0, true);
            controller.handleAnswer(0, true);
            expect(controller.streakService.count).toBe(2);
            controller.handleAnswer(0, false);
            expect(controller.streakService.count).toBe(0);
        });

        it('advances to next round after feedback delay on correct answer', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(5);
            const initialRound = controller.currentRound;
            controller.handleAnswer(0, true);
            // Should not advance immediately
            expect(controller.currentRound).toBe(initialRound);
            // Advance after feedback delay
            vi.advanceTimersByTime(SupervivenciaController.FEEDBACK_DELAY_MS);
            expect(controller.currentRound).toBe(initialRound + 1);
        });

        it('calls onRoundEnd callback with round data including livesRemaining', () => {
            const onRoundEnd = vi.fn();
            controller = new SupervivenciaController({ container, onRoundEnd });
            controller.start(pool);
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(7);
            controller.handleAnswer(0, true);
            expect(onRoundEnd).toHaveBeenCalledWith(expect.objectContaining({
                round: 1,
                correct: true,
                totalScore: expect.any(Number),
                streak: 1,
                timeRemaining: 7,
                questionType: expect.any(String),
                livesRemaining: 3,
            }));
        });

        it('records round in roundHistory with questionType', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(3);
            controller.handleAnswer(0, true);
            expect(controller.roundHistory).toHaveLength(1);
            expect(controller.roundHistory[0]).toEqual(expect.objectContaining({
                correct: true,
                points: expect.any(Number),
                timeRemaining: 3,
                questionType: expect.any(String),
            }));
        });
    });

    describe('handleTimeout', () => {
        it('marks the question as incorrect on timeout', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            controller.handleTimeout();
            expect(controller.roundHistory[0].correct).toBe(false);
            expect(controller.roundHistory[0].points).toBe(0);
        });

        it('deducts a life on timeout', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            controller.handleTimeout();
            expect(controller.lives).toBe(2);
        });

        it('resets streak on timeout', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(5);
            controller.handleAnswer(0, true);
            expect(controller.streakService.count).toBe(1);
            vi.advanceTimersByTime(SupervivenciaController.FEEDBACK_DELAY_MS);
            controller.handleTimeout();
            expect(controller.streakService.count).toBe(0);
        });
    });

    describe('end', () => {
        it('sets isActive to false', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            controller.end();
            expect(controller.isActive).toBe(false);
        });

        it('calls onGameEnd with session results including roundsReached', () => {
            const onGameEnd = vi.fn();
            controller = new SupervivenciaController({ container, onGameEnd });
            controller.start(pool);
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(5);
            controller.handleAnswer(0, true);
            vi.advanceTimersByTime(SupervivenciaController.FEEDBACK_DELAY_MS);
            controller.handleAnswer(0, true);
            controller.end();
            expect(onGameEnd).toHaveBeenCalledWith(expect.objectContaining({
                totalScore: expect.any(Number),
                roundsReached: expect.any(Number),
                roundHistory: expect.any(Array),
                highestStreak: 2,
            }));
        });

        it('stops the timer', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            const timerStopSpy = vi.spyOn(controller.timerView, 'stop');
            controller.end();
            expect(timerStopSpy).toHaveBeenCalled();
        });
    });

    describe('pool recycling', () => {
        it('recycles the pool when all countries have been used', () => {
            controller = new SupervivenciaController({ container });
            const smallPool = pool.slice(0, 5);
            controller.start(smallPool);
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(5);

            // Answer more questions than pool size
            for (let i = 0; i < 6; i++) {
                controller.handleAnswer(0, true);
                vi.advanceTimersByTime(SupervivenciaController.FEEDBACK_DELAY_MS);
            }

            // Should still be active (no crash from running out of pool)
            expect(controller.isActive).toBe(true);
            expect(controller.currentRound).toBe(7);
        });
    });

    describe('power-up integration', () => {
        it('grants power-up at streak milestone 3', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(5);

            for (let i = 0; i < 3; i++) {
                controller.handleAnswer(0, true);
                vi.advanceTimersByTime(SupervivenciaController.FEEDBACK_DELAY_MS);
            }

            expect(controller.powerUpService.inventory).toContain('timeExtra');
        });

        it('applies timeExtra power-up by adding 5 seconds to timer', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            controller.powerUpService.inventory.push('timeExtra');

            const addTimeSpy = vi.spyOn(controller.timerView, 'addTime');
            controller.handlePowerUpActivation('timeExtra');
            expect(addTimeSpy).toHaveBeenCalledWith(5);
        });

        it('applies freeze power-up by freezing the timer', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            controller.powerUpService.inventory.push('freeze');

            const freezeSpy = vi.spyOn(controller.timerView, 'freeze');
            controller.handlePowerUpActivation('freeze');
            expect(freezeSpy).toHaveBeenCalled();
        });

        it('applies 50/50 power-up by disabling 2 options', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            controller.powerUpService.inventory.push('fiftyFifty');

            controller.handlePowerUpActivation('fiftyFifty');

            const disabledButtons = container.querySelectorAll('.mc-option--disabled');
            expect(disabledButtons.length).toBe(2);
        });
    });

    describe('scoring integration', () => {
        it('calculates score based on time remaining', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(15);
            controller.handleAnswer(0, true);
            // BASE_POINTS * (15/15) * 1.0 = 1000
            expect(controller.totalScore).toBe(1000);
        });

        it('calculates score with streak multiplier', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(15);

            // Answer 3 correct to reach 1.5x multiplier
            controller.handleAnswer(0, true); // streak 1, mult 1.0 → 1000
            vi.advanceTimersByTime(SupervivenciaController.FEEDBACK_DELAY_MS);
            controller.handleAnswer(0, true); // streak 2, mult 1.0 → 1000
            vi.advanceTimersByTime(SupervivenciaController.FEEDBACK_DELAY_MS);
            controller.handleAnswer(0, true); // streak 3, mult 1.5 → 1500

            expect(controller.totalScore).toBe(1000 + 1000 + 1500);
        });
    });

    describe('no fixed round count', () => {
        it('continues indefinitely as long as lives remain', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(5);

            // Answer many correct questions
            for (let i = 0; i < 25; i++) {
                controller.handleAnswer(0, true);
                vi.advanceTimersByTime(SupervivenciaController.FEEDBACK_DELAY_MS);
            }

            expect(controller.isActive).toBe(true);
            expect(controller.currentRound).toBe(26);
            expect(controller.lives).toBe(3);
        });
    });

    describe('destroy', () => {
        it('clears the container', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            controller.destroy();
            expect(container.innerHTML).toBe('');
        });

        it('sets isActive to false', () => {
            controller = new SupervivenciaController({ container });
            controller.start(pool);
            controller.destroy();
            expect(controller.isActive).toBe(false);
        });
    });

    describe('getHighestStreak', () => {
        it('returns 0 when no rounds played', () => {
            controller = new SupervivenciaController({ container });
            expect(controller.getHighestStreak()).toBe(0);
        });

        it('calculates highest streak from round history', () => {
            controller = new SupervivenciaController({ container });
            controller.roundHistory = [
                { correct: true },
                { correct: true },
                { correct: true },
                { correct: false },
                { correct: true },
                { correct: true },
            ];
            expect(controller.getHighestStreak()).toBe(3);
        });
    });
});
