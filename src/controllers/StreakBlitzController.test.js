import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StreakBlitzController } from './StreakBlitzController.js';

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

describe('StreakBlitzController', () => {
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
            controller = new StreakBlitzController({ container });
            expect(controller.isActive).toBe(false);
            expect(controller.totalScore).toBe(0);
            expect(controller.currentRound).toBe(0);
            expect(controller.correctCount).toBe(0);
        });

        it('accepts onRoundEnd and onGameEnd callbacks', () => {
            const onRoundEnd = vi.fn();
            const onGameEnd = vi.fn();
            controller = new StreakBlitzController({ container, onRoundEnd, onGameEnd });
            expect(controller.onRoundEnd).toBe(onRoundEnd);
            expect(controller.onGameEnd).toBe(onGameEnd);
        });
    });

    describe('start', () => {
        it('sets isActive to true', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            expect(controller.isActive).toBe(true);
        });

        it('uses default session time of 90 seconds', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            expect(controller.sessionTime).toBe(90);
        });

        it('uses configurable sessionTime from modeOptions', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool, { sessionTime: 120 });
            expect(controller.sessionTime).toBe(120);
        });

        it('uses default timePerQuestion of 10 seconds', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            expect(controller.timePerQuestion).toBe(10);
        });

        it('uses configurable timePerQuestion from modeOptions', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool, { timePerQuestion: 15 });
            expect(controller.timePerQuestion).toBe(15);
        });

        it('resets score and counters', () => {
            controller = new StreakBlitzController({ container });
            controller.totalScore = 500;
            controller.currentRound = 5;
            controller.correctCount = 3;
            controller.start(pool);
            expect(controller.totalScore).toBe(0);
            expect(controller.correctCount).toBe(0);
            expect(controller.currentRound).toBe(1); // nextRound increments to 1
        });

        it('renders the game UI into the container', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            expect(container.querySelector('.streak-blitz-session-timer')).not.toBeNull();
            expect(container.querySelector('.streak-blitz-question-timer')).not.toBeNull();
            expect(container.querySelector('.streak-blitz-options')).not.toBeNull();
        });

        it('renders 4 multiple choice options', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            const buttons = container.querySelectorAll('.mc-option');
            expect(buttons.length).toBe(4);
        });

        it('does not mutate the original pool', () => {
            controller = new StreakBlitzController({ container });
            const originalPool = [...pool];
            controller.start(pool);
            expect(pool).toEqual(originalPool);
        });
    });

    describe('question type mixing', () => {
        it('assigns a question type (flag or capital) to each round', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            expect(['flag', 'capital']).toContain(controller.currentQuestionType);
        });

        it('shows flag image for flag questions', () => {
            controller = new StreakBlitzController({ container });
            // Force flag type by mocking Math.random
            vi.spyOn(Math, 'random').mockReturnValue(0.1); // < 0.5 → flag
            controller.start(pool);
            const flagEl = container.querySelector('.streak-blitz-flag');
            const promptEl = container.querySelector('.streak-blitz-prompt');
            expect(flagEl.style.display).not.toBe('none');
            expect(promptEl.style.display).toBe('none');
        });

        it('shows country name for capital questions', () => {
            controller = new StreakBlitzController({ container });
            // Force capital type by mocking Math.random
            vi.spyOn(Math, 'random').mockReturnValue(0.9); // >= 0.5 → capital
            controller.start(pool);
            const flagEl = container.querySelector('.streak-blitz-flag');
            const promptEl = container.querySelector('.streak-blitz-prompt');
            expect(flagEl.style.display).toBe('none');
            expect(promptEl.style.display).not.toBe('none');
        });

        it('enforces max 3 consecutive same type', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);

            // Force 3 consecutive flag questions
            controller.lastQuestionType = 'flag';
            controller.consecutiveSameType = 3;

            const nextType = controller.pickQuestionType();
            expect(nextType).toBe('capital');
        });

        it('forces opposite type after 3 consecutive', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);

            controller.lastQuestionType = 'capital';
            controller.consecutiveSameType = 3;

            const nextType = controller.pickQuestionType();
            expect(nextType).toBe('flag');
        });
    });

    describe('handleAnswer', () => {
        it('awards points for correct answers', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            vi.spyOn(controller.questionTimerView, 'getRemaining').mockReturnValue(5);
            controller.handleAnswer(0, true);
            expect(controller.totalScore).toBeGreaterThan(0);
        });

        it('awards zero points for incorrect answers', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            controller.handleAnswer(0, false);
            expect(controller.totalScore).toBe(0);
        });

        it('increments correctCount on correct answer', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            vi.spyOn(controller.questionTimerView, 'getRemaining').mockReturnValue(5);
            controller.handleAnswer(0, true);
            expect(controller.correctCount).toBe(1);
        });

        it('does not increment correctCount on incorrect answer', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            controller.handleAnswer(0, false);
            expect(controller.correctCount).toBe(0);
        });

        it('increments streak on correct answer', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            vi.spyOn(controller.questionTimerView, 'getRemaining').mockReturnValue(5);
            controller.handleAnswer(0, true);
            expect(controller.streakService.count).toBe(1);
        });

        it('resets streak on incorrect answer', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            vi.spyOn(controller.questionTimerView, 'getRemaining').mockReturnValue(5);
            controller.handleAnswer(0, true);
            controller.handleAnswer(0, true);
            expect(controller.streakService.count).toBe(2);
            controller.handleAnswer(0, false);
            expect(controller.streakService.count).toBe(0);
        });

        it('immediately advances to next question (no feedback delay)', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            const initialRound = controller.currentRound;
            controller.handleAnswer(0, true);
            // Should advance immediately without needing to wait
            expect(controller.currentRound).toBe(initialRound + 1);
        });

        it('calls onRoundEnd callback with round data', () => {
            const onRoundEnd = vi.fn();
            controller = new StreakBlitzController({ container, onRoundEnd });
            controller.start(pool);
            vi.spyOn(controller.questionTimerView, 'getRemaining').mockReturnValue(7);
            controller.handleAnswer(0, true);
            expect(onRoundEnd).toHaveBeenCalledWith(expect.objectContaining({
                round: 1,
                correct: true,
                totalScore: expect.any(Number),
                streak: 1,
                timeRemaining: 7,
                questionType: expect.any(String),
            }));
        });

        it('records round in roundHistory with questionType', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            vi.spyOn(controller.questionTimerView, 'getRemaining').mockReturnValue(3);
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
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            controller.handleTimeout();
            expect(controller.roundHistory[0].correct).toBe(false);
            expect(controller.roundHistory[0].points).toBe(0);
        });

        it('resets streak on timeout', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            vi.spyOn(controller.questionTimerView, 'getRemaining').mockReturnValue(5);
            controller.handleAnswer(0, true);
            expect(controller.streakService.count).toBe(1);
            controller.handleTimeout();
            expect(controller.streakService.count).toBe(0);
        });

        it('immediately advances to next question on timeout', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            const roundBeforeTimeout = controller.currentRound;
            controller.handleTimeout();
            expect(controller.currentRound).toBe(roundBeforeTimeout + 1);
        });
    });

    describe('session timer', () => {
        it('ends the game when session timer expires', () => {
            const onGameEnd = vi.fn();
            controller = new StreakBlitzController({ container, onGameEnd });
            controller.start(pool, { sessionTime: 90 });
            controller.handleSessionExpired();
            expect(controller.isActive).toBe(false);
            expect(onGameEnd).toHaveBeenCalled();
        });

        it('includes totalQuestions and correctCount in game end data', () => {
            const onGameEnd = vi.fn();
            controller = new StreakBlitzController({ container, onGameEnd });
            controller.start(pool);
            vi.spyOn(controller.questionTimerView, 'getRemaining').mockReturnValue(5);
            controller.handleAnswer(0, true);
            controller.handleAnswer(0, false);
            controller.handleAnswer(0, true);
            controller.handleSessionExpired();
            expect(onGameEnd).toHaveBeenCalledWith(expect.objectContaining({
                totalQuestions: expect.any(Number),
                correctCount: 2,
                highestStreak: expect.any(Number),
            }));
        });
    });

    describe('end', () => {
        it('sets isActive to false', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            controller.end();
            expect(controller.isActive).toBe(false);
        });

        it('calls onGameEnd with session results', () => {
            const onGameEnd = vi.fn();
            controller = new StreakBlitzController({ container, onGameEnd });
            controller.start(pool);
            vi.spyOn(controller.questionTimerView, 'getRemaining').mockReturnValue(5);
            controller.handleAnswer(0, true);
            controller.handleAnswer(0, true);
            controller.end();
            expect(onGameEnd).toHaveBeenCalledWith(expect.objectContaining({
                totalScore: expect.any(Number),
                totalQuestions: expect.any(Number),
                correctCount: 2,
                roundHistory: expect.any(Array),
                highestStreak: 2,
            }));
        });

        it('stops both timers', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            const questionStopSpy = vi.spyOn(controller.questionTimerView, 'stop');
            const sessionStopSpy = vi.spyOn(controller.sessionTimerView, 'stop');
            controller.end();
            expect(questionStopSpy).toHaveBeenCalled();
            expect(sessionStopSpy).toHaveBeenCalled();
        });
    });

    describe('power-up integration', () => {
        it('grants power-up at streak milestone 3', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            vi.spyOn(controller.questionTimerView, 'getRemaining').mockReturnValue(5);

            for (let i = 0; i < 3; i++) {
                controller.handleAnswer(0, true);
            }

            expect(controller.powerUpService.inventory).toContain('timeExtra');
        });

        it('applies timeExtra power-up by adding 5 seconds to question timer', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            controller.powerUpService.inventory.push('timeExtra');

            const addTimeSpy = vi.spyOn(controller.questionTimerView, 'addTime');
            controller.handlePowerUpActivation('timeExtra');
            expect(addTimeSpy).toHaveBeenCalledWith(5);
        });

        it('applies freeze power-up by freezing the question timer', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            controller.powerUpService.inventory.push('freeze');

            const freezeSpy = vi.spyOn(controller.questionTimerView, 'freeze');
            controller.handlePowerUpActivation('freeze');
            expect(freezeSpy).toHaveBeenCalled();
        });

        it('applies 50/50 power-up by disabling 2 options', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            controller.powerUpService.inventory.push('fiftyFifty');

            controller.handlePowerUpActivation('fiftyFifty');

            const disabledButtons = container.querySelectorAll('.mc-option--disabled');
            expect(disabledButtons.length).toBe(2);
        });
    });

    describe('scoring integration', () => {
        it('calculates score based on time remaining', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool, { timePerQuestion: 10 });
            vi.spyOn(controller.questionTimerView, 'getRemaining').mockReturnValue(10);
            controller.handleAnswer(0, true);
            // BASE_POINTS * (10/10) * 1.0 = 1000
            expect(controller.totalScore).toBe(1000);
        });

        it('calculates score with streak multiplier', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool, { timePerQuestion: 10 });
            vi.spyOn(controller.questionTimerView, 'getRemaining').mockReturnValue(10);

            // Answer 3 correct to reach 1.5x multiplier
            controller.handleAnswer(0, true); // streak 1, mult 1.0 → 1000
            controller.handleAnswer(0, true); // streak 2, mult 1.0 → 1000
            controller.handleAnswer(0, true); // streak 3, mult 1.5 → 1500

            expect(controller.totalScore).toBe(1000 + 1000 + 1500);
        });
    });

    describe('pool cycling', () => {
        it('cycles through the pool when more questions than pool size', () => {
            controller = new StreakBlitzController({ container });
            const smallPool = pool.slice(0, 5);
            controller.start(smallPool);
            vi.spyOn(controller.questionTimerView, 'getRemaining').mockReturnValue(5);

            // Answer more questions than pool size
            for (let i = 0; i < 6; i++) {
                controller.handleAnswer(0, true);
            }

            // Should still be active (no crash from running out of pool)
            expect(controller.isActive).toBe(true);
            expect(controller.currentRound).toBe(7);
        });
    });

    describe('destroy', () => {
        it('clears the container', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            controller.destroy();
            expect(container.innerHTML).toBe('');
        });

        it('sets isActive to false', () => {
            controller = new StreakBlitzController({ container });
            controller.start(pool);
            controller.destroy();
            expect(controller.isActive).toBe(false);
        });
    });

    describe('getHighestStreak', () => {
        it('returns 0 when no rounds played', () => {
            controller = new StreakBlitzController({ container });
            expect(controller.getHighestStreak()).toBe(0);
        });

        it('calculates highest streak from round history', () => {
            controller = new StreakBlitzController({ container });
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
