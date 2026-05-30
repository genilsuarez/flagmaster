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
            expect(result.score).toBe(100);
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
            expect(result.score).toBe(0);
            expect(result.results.every(r => !r.isCorrect)).toBe(true);
        });

        it('calculates score as Math.round((correct / total) * 100)', () => {
            const assignments = new Map([
                ['item-1', 'Europe'],   // correct
                ['item-2', 'Europe'],   // incorrect
                ['item-3', 'Africa'],   // correct
                ['item-4', 'Africa'],   // incorrect
            ]);

            const result = evaluate(assignments, items);

            expect(result.correct).toBe(2);
            expect(result.incorrect).toBe(2);
            expect(result.score).toBe(50);
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
            expect(result.score).toBe(100);
        });

        it('treats unassigned items (not in assignments) as incorrect', () => {
            const assignments = new Map([
                ['item-1', 'Europe'],
                ['item-2', 'Asia'],
            ]);

            const result = evaluate(assignments, items);

            expect(result.correct).toBe(2);
            expect(result.incorrect).toBe(2);
            expect(result.score).toBe(50);
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

        it('rounds score correctly for non-integer percentages', () => {
            // 1 correct out of 3 = 33.33... → rounds to 33
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
            expect(result.score).toBe(33);
        });

        it('rounds score up when fraction >= 0.5', () => {
            // 2 correct out of 3 = 66.66... → rounds to 67
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
            expect(result.score).toBe(67);
        });
    });
});
