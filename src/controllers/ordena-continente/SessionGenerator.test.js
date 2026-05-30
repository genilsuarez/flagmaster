/**
 * SessionGenerator — Unit Tests
 * Feature: sort-by-continent
 *
 * Tests for the generateSession function that creates game items and zones
 * for the "Ordena por Continente" mode.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect } from 'vitest';
import { generateSession } from './SessionGenerator.js';

// Sample pool mimicking flags.json structure
const samplePool = [
    { Continent: 'Africa', Country_English: 'Algeria', Country_Spanish: 'Argelia', Capital_Spanish: 'Argel', Flag_URL: 'https://flagcdn.com/dz.svg', Sovereign_State: 'Yes' },
    { Continent: 'Africa', Country_English: 'Angola', Country_Spanish: 'Angola', Capital_Spanish: 'Luanda', Flag_URL: 'https://flagcdn.com/ao.svg', Sovereign_State: 'Yes' },
    { Continent: 'Africa', Country_English: 'Benin', Country_Spanish: 'Benín', Capital_Spanish: 'Porto Novo', Flag_URL: 'https://flagcdn.com/bj.svg', Sovereign_State: 'Yes' },
    { Continent: 'Africa', Country_English: 'Botswana', Country_Spanish: 'Botsuana', Capital_Spanish: 'Gaborone', Flag_URL: 'https://flagcdn.com/bw.svg', Sovereign_State: 'Yes' },
    { Continent: 'Africa', Country_English: 'Réunion', Country_Spanish: 'Reunión', Capital_Spanish: 'Saint-Denis', Flag_URL: 'https://flagcdn.com/re.svg', Sovereign_State: 'No' },
    { Continent: 'America', Country_English: 'Argentina', Country_Spanish: 'Argentina', Capital_Spanish: 'Buenos Aires', Flag_URL: 'https://flagcdn.com/ar.svg', Sovereign_State: 'Yes' },
    { Continent: 'America', Country_English: 'Brazil', Country_Spanish: 'Brasil', Capital_Spanish: 'Brasília', Flag_URL: 'https://flagcdn.com/br.svg', Sovereign_State: 'Yes' },
    { Continent: 'America', Country_English: 'Chile', Country_Spanish: 'Chile', Capital_Spanish: 'Santiago', Flag_URL: 'https://flagcdn.com/cl.svg', Sovereign_State: 'Yes' },
    { Continent: 'America', Country_English: 'Colombia', Country_Spanish: 'Colombia', Capital_Spanish: 'Bogotá', Flag_URL: 'https://flagcdn.com/co.svg', Sovereign_State: 'Yes' },
    { Continent: 'America', Country_English: 'Aruba', Country_Spanish: 'Aruba', Capital_Spanish: 'Oranjestad', Flag_URL: 'https://flagcdn.com/aw.svg', Sovereign_State: 'No' },
    { Continent: 'Asia', Country_English: 'China', Country_Spanish: 'China', Capital_Spanish: 'Pekín', Flag_URL: 'https://flagcdn.com/cn.svg', Sovereign_State: 'Yes' },
    { Continent: 'Asia', Country_English: 'India', Country_Spanish: 'India', Capital_Spanish: 'Nueva Delhi', Flag_URL: 'https://flagcdn.com/in.svg', Sovereign_State: 'Yes' },
    { Continent: 'Asia', Country_English: 'Japan', Country_Spanish: 'Japón', Capital_Spanish: 'Tokio', Flag_URL: 'https://flagcdn.com/jp.svg', Sovereign_State: 'Yes' },
    { Continent: 'Asia', Country_English: 'South Korea', Country_Spanish: 'Corea del Sur', Capital_Spanish: 'Seúl', Flag_URL: 'https://flagcdn.com/kr.svg', Sovereign_State: 'Yes' },
    { Continent: 'Europe', Country_English: 'France', Country_Spanish: 'Francia', Capital_Spanish: 'París', Flag_URL: 'https://flagcdn.com/fr.svg', Sovereign_State: 'Yes' },
    { Continent: 'Europe', Country_English: 'Germany', Country_Spanish: 'Alemania', Capital_Spanish: 'Berlín', Flag_URL: 'https://flagcdn.com/de.svg', Sovereign_State: 'Yes' },
    { Continent: 'Europe', Country_English: 'Spain', Country_Spanish: 'España', Capital_Spanish: 'Madrid', Flag_URL: 'https://flagcdn.com/es.svg', Sovereign_State: 'Yes' },
    { Continent: 'Europe', Country_English: 'Italy', Country_Spanish: 'Italia', Capital_Spanish: 'Roma', Flag_URL: 'https://flagcdn.com/it.svg', Sovereign_State: 'Yes' },
    { Continent: 'Oceania', Country_English: 'Australia', Country_Spanish: 'Australia', Capital_Spanish: 'Canberra', Flag_URL: 'https://flagcdn.com/au.svg', Sovereign_State: 'Yes' },
    { Continent: 'Oceania', Country_English: 'New Zealand', Country_Spanish: 'Nueva Zelanda', Capital_Spanish: 'Wellington', Flag_URL: 'https://flagcdn.com/nz.svg', Sovereign_State: 'Yes' },
    // Country with empty capital (should be excluded in capitals mode)
    { Continent: 'Africa', Country_English: 'TestEmpty', Country_Spanish: 'TestVacío', Capital_Spanish: '', Flag_URL: 'https://flagcdn.com/xx.svg', Sovereign_State: 'Yes' },
    // Country with "Desconocida" capital (should be excluded in capitals mode)
    { Continent: 'Africa', Country_English: 'TestUnknown', Country_Spanish: 'TestDesconocido', Capital_Spanish: 'Desconocida', Flag_URL: 'https://flagcdn.com/yy.svg', Sovereign_State: 'Yes' },
];

describe('SessionGenerator', () => {
    describe('generateSession - validation', () => {
        it('throws error when fewer than 2 continents are selected', () => {
            expect(() => generateSession(samplePool, {
                itemCount: 6,
                continents: ['Africa'],
                itemType: 'flags',
            })).toThrow('Se requieren al menos 2 continentes');
        });

        it('throws error when continents array is empty', () => {
            expect(() => generateSession(samplePool, {
                itemCount: 6,
                continents: [],
                itemType: 'flags',
            })).toThrow('Se requieren al menos 2 continentes');
        });

        it('throws error when continents is undefined', () => {
            expect(() => generateSession(samplePool, {
                itemCount: 6,
                continents: undefined,
                itemType: 'flags',
            })).toThrow('Se requieren al menos 2 continentes');
        });
    });

    describe('generateSession - filtering', () => {
        it('only includes sovereign countries (Sovereign_State === "Yes")', () => {
            const result = generateSession(samplePool, {
                itemCount: 6,
                continents: ['Africa', 'America'],
                itemType: 'flags',
            });

            // Non-sovereign countries like Réunion and Aruba should not appear
            const countryIds = result.items.map((item) => item.countryId);
            expect(countryIds).not.toContain('Réunion');
            expect(countryIds).not.toContain('Aruba');
        });

        it('excludes countries with empty Capital_Spanish when itemType is "capitals"', () => {
            const result = generateSession(samplePool, {
                itemCount: 6,
                continents: ['Africa', 'America'],
                itemType: 'capitals',
            });

            const countryIds = result.items.map((item) => item.countryId);
            expect(countryIds).not.toContain('TestEmpty');
        });

        it('excludes countries with "Desconocida" Capital_Spanish when itemType is "capitals"', () => {
            const result = generateSession(samplePool, {
                itemCount: 6,
                continents: ['Africa', 'America'],
                itemType: 'capitals',
            });

            const countryIds = result.items.map((item) => item.countryId);
            expect(countryIds).not.toContain('TestUnknown');
        });

        it('does NOT exclude countries with empty/Desconocida capital when itemType is "flags"', () => {
            // With flags mode, capital filtering should not apply
            const poolWithOnlyEmptyCapitals = [
                { Continent: 'Africa', Country_English: 'TestEmpty', Country_Spanish: 'TestVacío', Capital_Spanish: '', Flag_URL: 'https://flagcdn.com/xx.svg', Sovereign_State: 'Yes' },
                { Continent: 'Africa', Country_English: 'TestUnknown', Country_Spanish: 'TestDesconocido', Capital_Spanish: 'Desconocida', Flag_URL: 'https://flagcdn.com/yy.svg', Sovereign_State: 'Yes' },
                { Continent: 'America', Country_English: 'Argentina', Country_Spanish: 'Argentina', Capital_Spanish: 'Buenos Aires', Flag_URL: 'https://flagcdn.com/ar.svg', Sovereign_State: 'Yes' },
                { Continent: 'America', Country_English: 'Brazil', Country_Spanish: 'Brasil', Capital_Spanish: 'Brasília', Flag_URL: 'https://flagcdn.com/br.svg', Sovereign_State: 'Yes' },
            ];

            const result = generateSession(poolWithOnlyEmptyCapitals, {
                itemCount: 4,
                continents: ['Africa', 'America'],
                itemType: 'flags',
            });

            expect(result.items.length).toBe(4);
        });
    });

    describe('generateSession - distribution', () => {
        it('returns exactly itemCount items', () => {
            const result = generateSession(samplePool, {
                itemCount: 8,
                continents: ['Africa', 'America', 'Asia', 'Europe'],
                itemType: 'flags',
            });

            expect(result.items.length).toBe(8);
        });

        it('distributes items across all selected continents', () => {
            const result = generateSession(samplePool, {
                itemCount: 8,
                continents: ['Africa', 'America', 'Asia', 'Europe'],
                itemType: 'flags',
            });

            const continentsInItems = new Set(result.items.map((item) => item.continent));
            expect(continentsInItems.has('Africa')).toBe(true);
            expect(continentsInItems.has('America')).toBe(true);
            expect(continentsInItems.has('Asia')).toBe(true);
            expect(continentsInItems.has('Europe')).toBe(true);
        });

        it('each continent gets at least floor(itemCount/numContinents) items', () => {
            const result = generateSession(samplePool, {
                itemCount: 10,
                continents: ['Africa', 'America', 'Asia', 'Europe'],
                itemType: 'flags',
            });

            const countByContinent = {};
            for (const item of result.items) {
                countByContinent[item.continent] = (countByContinent[item.continent] || 0) + 1;
            }

            const minPerContinent = Math.floor(10 / 4); // 2
            for (const continent of ['Africa', 'America', 'Asia', 'Europe']) {
                expect(countByContinent[continent]).toBeGreaterThanOrEqual(minPerContinent);
            }
        });

        it('handles continent with fewer countries than quota by redistributing', () => {
            // Oceania only has 2 sovereign countries in our sample
            const result = generateSession(samplePool, {
                itemCount: 12,
                continents: ['Africa', 'America', 'Oceania'],
                itemType: 'flags',
            });

            expect(result.items.length).toBe(12);

            const countByContinent = {};
            for (const item of result.items) {
                countByContinent[item.continent] = (countByContinent[item.continent] || 0) + 1;
            }

            // Oceania has max 2 sovereign countries, so it should have at most 2
            expect(countByContinent['Oceania']).toBeLessThanOrEqual(2);
            // Total should still be 12
            const total = Object.values(countByContinent).reduce((a, b) => a + b, 0);
            expect(total).toBe(12);
        });

        it('produces no duplicate countries', () => {
            const result = generateSession(samplePool, {
                itemCount: 10,
                continents: ['Africa', 'America', 'Asia', 'Europe'],
                itemType: 'flags',
            });

            const countryIds = result.items.map((item) => item.countryId);
            const uniqueIds = new Set(countryIds);
            expect(uniqueIds.size).toBe(countryIds.length);
        });
    });

    describe('generateSession - GameItem structure', () => {
        it('generates items with all required fields', () => {
            const result = generateSession(samplePool, {
                itemCount: 6,
                continents: ['Africa', 'America'],
                itemType: 'flags',
            });

            for (const item of result.items) {
                expect(item).toHaveProperty('id');
                expect(item).toHaveProperty('countryId');
                expect(item).toHaveProperty('continent');
                expect(item).toHaveProperty('flagUrl');
                expect(item).toHaveProperty('capital');
                expect(item).toHaveProperty('displayValue');
                expect(item).toHaveProperty('displayType');
                expect(typeof item.id).toBe('string');
                expect(item.id.length).toBeGreaterThan(0);
            }
        });

        it('sets displayValue to Flag_URL and displayType to "flag" when itemType is "flags"', () => {
            const result = generateSession(samplePool, {
                itemCount: 6,
                continents: ['Africa', 'America'],
                itemType: 'flags',
            });

            for (const item of result.items) {
                expect(item.displayValue).toBe(item.flagUrl);
                expect(item.displayType).toBe('flag');
            }
        });

        it('sets displayValue to Capital_Spanish and displayType to "capital" when itemType is "capitals"', () => {
            const result = generateSession(samplePool, {
                itemCount: 6,
                continents: ['Africa', 'America'],
                itemType: 'capitals',
            });

            for (const item of result.items) {
                expect(item.displayValue).toBe(item.capital);
                expect(item.displayType).toBe('capital');
            }
        });

        it('generates unique IDs for each item', () => {
            const result = generateSession(samplePool, {
                itemCount: 10,
                continents: ['Africa', 'America', 'Asia', 'Europe'],
                itemType: 'flags',
            });

            const ids = result.items.map((item) => item.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });
    });

    describe('generateSession - Zone structure', () => {
        it('generates one zone per selected continent', () => {
            const result = generateSession(samplePool, {
                itemCount: 6,
                continents: ['Africa', 'America', 'Asia'],
                itemType: 'flags',
            });

            expect(result.zones.length).toBe(3);
        });

        it('zones have correct structure with id, continent, and label', () => {
            const result = generateSession(samplePool, {
                itemCount: 6,
                continents: ['Africa', 'America'],
                itemType: 'flags',
            });

            for (const zone of result.zones) {
                expect(zone).toHaveProperty('id');
                expect(zone).toHaveProperty('continent');
                expect(zone).toHaveProperty('label');
                expect(typeof zone.id).toBe('string');
                expect(zone.id.length).toBeGreaterThan(0);
            }
        });

        it('zones have correct Spanish labels', () => {
            const result = generateSession(samplePool, {
                itemCount: 10,
                continents: ['Africa', 'America', 'Asia', 'Europe', 'Oceania'],
                itemType: 'flags',
            });

            const labelMap = {};
            for (const zone of result.zones) {
                labelMap[zone.continent] = zone.label;
            }

            expect(labelMap['Africa']).toBe('África');
            expect(labelMap['America']).toBe('América');
            expect(labelMap['Asia']).toBe('Asia');
            expect(labelMap['Europe']).toBe('Europa');
            expect(labelMap['Oceania']).toBe('Oceanía');
        });

        it('zones have unique IDs', () => {
            const result = generateSession(samplePool, {
                itemCount: 6,
                continents: ['Africa', 'America', 'Asia'],
                itemType: 'flags',
            });

            const ids = result.zones.map((zone) => zone.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });
    });
});
