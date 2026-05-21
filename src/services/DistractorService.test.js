import { describe, it, expect, beforeEach } from 'vitest';
import { DistractorService } from './DistractorService.js';

/**
 * Helper to create mock country objects matching the Country model shape.
 */
function makeCountry(name, continent) {
    return {
        englishName: name,
        spanishName: name,
        continent,
        flagUrl: `https://flagcdn.com/${name.toLowerCase()}.svg`,
        isSovereign: true,
    };
}

describe('DistractorService', () => {
    let service;
    let pool;
    let france, germany, spain, italy, brazil, argentina, japan, australia;

    beforeEach(() => {
        service = new DistractorService();

        france = makeCountry('France', 'Europe');
        germany = makeCountry('Germany', 'Europe');
        spain = makeCountry('Spain', 'Europe');
        italy = makeCountry('Italy', 'Europe');
        brazil = makeCountry('Brazil', 'South America');
        argentina = makeCountry('Argentina', 'South America');
        japan = makeCountry('Japan', 'Asia');
        australia = makeCountry('Australia', 'Oceania');

        pool = [france, germany, spain, italy, brazil, argentina, japan, australia];
    });

    describe('generateDistractors', () => {
        it('returns the requested number of distractors', () => {
            const distractors = service.generateDistractors(france, pool, 3);
            expect(distractors).toHaveLength(3);
        });

        it('never includes the correct country in distractors', () => {
            for (let i = 0; i < 50; i++) {
                const distractors = service.generateDistractors(france, pool, 3);
                expect(distractors).not.toContain(france);
            }
        });

        it('returns unique distractors (no duplicates)', () => {
            for (let i = 0; i < 50; i++) {
                const distractors = service.generateDistractors(france, pool, 3);
                const unique = new Set(distractors);
                expect(unique.size).toBe(distractors.length);
            }
        });

        it('prefers same-continent countries when preferSameContinent is true', () => {
            // France is in Europe, pool has 3 other European countries
            const distractors = service.generateDistractors(france, pool, 3, true);
            const allEuropean = distractors.every(c => c.continent === 'Europe');
            expect(allEuropean).toBe(true);
        });

        it('falls back to mixed continents when not enough same-continent countries', () => {
            // Brazil is in South America, only Argentina is also there
            const distractors = service.generateDistractors(brazil, pool, 3, true);
            expect(distractors).toHaveLength(3);
            expect(distractors).not.toContain(brazil);
            expect(distractors).toContain(argentina);
        });

        it('selects randomly from full pool when preferSameContinent is false', () => {
            const distractors = service.generateDistractors(france, pool, 3, false);
            expect(distractors).toHaveLength(3);
            expect(distractors).not.toContain(france);
        });

        it('returns all eligible countries when pool is smaller than count', () => {
            const smallPool = [france, germany, spain];
            const distractors = service.generateDistractors(france, smallPool, 3);
            expect(distractors).toHaveLength(2);
            expect(distractors).toContain(germany);
            expect(distractors).toContain(spain);
        });

        it('returns empty array when pool only contains the correct country', () => {
            const distractors = service.generateDistractors(france, [france], 3);
            expect(distractors).toHaveLength(0);
        });

        it('handles count of 0', () => {
            const distractors = service.generateDistractors(france, pool, 0);
            expect(distractors).toHaveLength(0);
        });
    });

    describe('shuffleOptions', () => {
        it('returns an array containing the correct answer and all distractors', () => {
            const distractors = [germany, spain, italy];
            const options = service.shuffleOptions(france, distractors);
            expect(options).toHaveLength(4);
            expect(options).toContain(france);
            expect(options).toContain(germany);
            expect(options).toContain(spain);
            expect(options).toContain(italy);
        });

        it('does not always place the correct answer first', () => {
            const distractors = [germany, spain, italy];
            let firstPositionCount = 0;
            const iterations = 100;

            for (let i = 0; i < iterations; i++) {
                const options = service.shuffleOptions(france, distractors);
                if (options[0] === france) firstPositionCount++;
            }

            // With 4 options, expected ~25% in first position
            // Allow generous range to avoid flaky tests
            expect(firstPositionCount).toBeLessThan(iterations);
        });

        it('does not mutate the input distractors array', () => {
            const distractors = [germany, spain, italy];
            const original = [...distractors];
            service.shuffleOptions(france, distractors);
            expect(distractors).toEqual(original);
        });

        it('works with empty distractors array', () => {
            const options = service.shuffleOptions(france, []);
            expect(options).toHaveLength(1);
            expect(options[0]).toBe(france);
        });
    });

    describe('pickRandom', () => {
        it('returns the requested number of elements', () => {
            const result = service.pickRandom(pool, 3);
            expect(result).toHaveLength(3);
        });

        it('returns unique elements', () => {
            for (let i = 0; i < 50; i++) {
                const result = service.pickRandom(pool, 4);
                const unique = new Set(result);
                expect(unique.size).toBe(result.length);
            }
        });

        it('does not mutate the original array', () => {
            const original = [...pool];
            service.pickRandom(pool, 3);
            expect(pool).toEqual(original);
        });

        it('returns all elements when count exceeds array length', () => {
            const result = service.pickRandom(pool, 20);
            expect(result).toHaveLength(pool.length);
        });
    });
});
