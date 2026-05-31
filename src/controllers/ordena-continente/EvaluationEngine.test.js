import { describe, it, expect } from 'vitest';
import { evaluate } from './EvaluationEngine.js';

describe('EvaluationEngine', () => {
    const items = [
        { id: 'item-1', continent: 'Europe' },
        { id: 'item-2', continent: 'Asia' },
        { id: 'item-3', continent: 'Africa' },
        { id: 'item-4', continent: 'America' },
    ];

    describe('evaluate', () => {
        it('marks all items correct when all assignments match', () => {
            const assignments = new Map([
                ['item-1', 'Europe'],
                ['item-2', 'Asia'],
                ['item-3', 'Africa'],
                ['item-4', 'America'],
            ]);

            const result = evaluate(assignments, items);

            expect(result.correct).toBe(4);
            expect(result.incorrect).toBe(0);
            expect(result.score).toBe(400);
            expect(result.results.every(r => r.isCorrect)).toBe(true);
        });

        it('marks all items incorrect when no assignments match', () => {
            const assignments = new Map([
                ['item-1', 'Asia'],
                ['item-2', 'Europe'],
                ['item-3', 'America'],
                ['item-4', 'Africa'],
            ]);

            const result = evaluate(assignments, items);

            expect(result.correct).toBe(0);
            expect(result.incorrect).toBe(4);
            // 0*100 - 4*15 = -60, clamped to 0
            expect(result.score).toBe(0);
            expect(result.results.every(r => !r.isCorrect)).toBe(true);
        });

        it('calculates score as (correct * 100) - (incorrect * 15)', () => {
            const assignments = new Map([
                ['item-1', 'Europe'],   // correct
                ['item-2', 'Europe'],   // incorrect
                ['item-3', 'Africa'],   // correct
                ['item-4', 'Africa'],   // incorrect
            ]);

            const result = evaluate(assignments, items);

            expect(result.correct).toBe(2);
            expect(result.incorrect).toBe(2);
            // 2*100 - 2*15 = 170
            expect(result.score).toBe(170);
        });

        it('includes correctZone for all items in results', () => {
            const assignments = new Map([
                ['item-1', 'Asia'],
                ['item-2', 'Asia'],
                ['item-3', 'Africa'],
                ['item-4', 'America'],
            ]);

            const result = evaluate(assignments, items);

            expect(result.results[0]).toEqual({
                itemId: 'item-1',
                assignedZone: 'Asia',
                correctZone: 'Europe',
                isCorrect: false,
            });
            expect(result.results[2]).toEqual({
                itemId: 'item-3',
                assignedZone: 'Africa',
                correctZone: 'Africa',
                isCorrect: true,
            });
        });

        it('accepts a plain object as assignments', () => {
            const assignments = {
                'item-1': 'Europe',
                'item-2': 'Asia',
                'item-3': 'Africa',
                'item-4': 'America',
            };

            const result = evaluate(assignments, items);

            expect(result.correct).toBe(4);
            expect(result.score).toBe(400);
        });

        it('treats unassigned items (not in assignments) as incorrect', () => {
            const assignments = new Map([
                ['item-1', 'Europe'],
                ['item-2', 'Asia'],
            ]);

            const result = evaluate(assignments, items);

            expect(result.correct).toBe(2);
            expect(result.incorrect).toBe(2);
            // 2*100 - 2*15 = 170
            expect(result.score).toBe(170);
            expect(result.results[2].assignedZone).toBeNull();
            expect(result.results[2].isCorrect).toBe(false);
        });

        it('returns score 0 for empty items array', () => {
            const assignments = new Map();
            const result = evaluate(assignments, []);

            expect(result.results).toEqual([]);
            expect(result.score).toBe(0);
            expect(result.correct).toBe(0);
            expect(result.incorrect).toBe(0);
        });

        it('scores with penalty: 1 correct, 2 incorrect = 100 - 30 = 70', () => {
            const threeItems = [
                { id: 'a', continent: 'Europe' },
                { id: 'b', continent: 'Asia' },
                { id: 'c', continent: 'Africa' },
            ];
            const assignments = new Map([
                ['a', 'Europe'],
                ['b', 'Europe'],
                ['c', 'Europe'],
            ]);

            const result = evaluate(assignments, threeItems);

            expect(result.correct).toBe(1);
            // 1*100 - 2*15 = 70
            expect(result.score).toBe(70);
        });

        it('scores with penalty: 2 correct, 1 incorrect = 200 - 15 = 185', () => {
            const threeItems = [
                { id: 'a', continent: 'Europe' },
                { id: 'b', continent: 'Asia' },
                { id: 'c', continent: 'Africa' },
            ];
            const assignments = new Map([
                ['a', 'Europe'],
                ['b', 'Asia'],
                ['c', 'Europe'],
            ]);

            const result = evaluate(assignments, threeItems);

            expect(result.correct).toBe(2);
            // 2*100 - 1*15 = 185
            expect(result.score).toBe(185);
        });

        it('score never goes below 0', () => {
            // All wrong: 0*100 - 4*15 = -60 → clamped to 0
            const assignments = new Map([
                ['item-1', 'Asia'],
                ['item-2', 'Europe'],
                ['item-3', 'America'],
                ['item-4', 'Africa'],
            ]);

            const result = evaluate(assignments, items);
            expect(result.score).toBe(0);
        });
    });
});
