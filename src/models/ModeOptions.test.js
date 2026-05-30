import { describe, it, expect } from 'vitest';
import { MODE_OPTIONS, getOptionsForMode } from './ModeOptions.js';
import { GAME_MODES } from './ModeDefinition.js';

describe('ModeOptions', () => {
    it('defines options for all 8 game modes', () => {
        const modeIds = Object.keys(GAME_MODES);
        expect(modeIds).toHaveLength(8);

        for (const modeId of modeIds) {
            expect(MODE_OPTIONS).toHaveProperty(modeId);
            expect(Array.isArray(MODE_OPTIONS[modeId])).toBe(true);
        }
    });

    it('each option has required schema fields: id, label, type, default', () => {
        for (const [modeId, options] of Object.entries(MODE_OPTIONS)) {
            for (const opt of options) {
                expect(opt).toHaveProperty('id');
                expect(opt).toHaveProperty('label');
                expect(opt).toHaveProperty('type');
                expect(opt).toHaveProperty('default');
                expect(typeof opt.id).toBe('string');
                expect(typeof opt.label).toBe('string');
                expect(['number', 'select', 'multiSelect']).toContain(opt.type);
            }
        }
    });

    it('number-type options have min and max', () => {
        for (const [modeId, options] of Object.entries(MODE_OPTIONS)) {
            for (const opt of options) {
                if (opt.type === 'number') {
                    expect(opt).toHaveProperty('min');
                    expect(opt).toHaveProperty('max');
                    expect(typeof opt.min).toBe('number');
                    expect(typeof opt.max).toBe('number');
                    expect(opt.min).toBeLessThanOrEqual(opt.max);
                }
            }
        }
    });

    it('select-type options have an options array with value and label', () => {
        for (const [modeId, options] of Object.entries(MODE_OPTIONS)) {
            for (const opt of options) {
                if (opt.type === 'select') {
                    expect(opt).toHaveProperty('options');
                    expect(Array.isArray(opt.options)).toBe(true);
                    expect(opt.options.length).toBeGreaterThan(0);
                    for (const o of opt.options) {
                        expect(o).toHaveProperty('value');
                        expect(o).toHaveProperty('label');
                    }
                }
            }
        }
    });

    it('default values are within valid range for number options', () => {
        for (const [modeId, options] of Object.entries(MODE_OPTIONS)) {
            for (const opt of options) {
                if (opt.type === 'number') {
                    expect(opt.default).toBeGreaterThanOrEqual(opt.min);
                    expect(opt.default).toBeLessThanOrEqual(opt.max);
                }
            }
        }
    });

    it('default values are valid option values for select options', () => {
        for (const [modeId, options] of Object.entries(MODE_OPTIONS)) {
            for (const opt of options) {
                if (opt.type === 'select') {
                    const validValues = opt.options.map(o => o.value);
                    expect(validValues).toContain(opt.default);
                }
            }
        }
    });

    it('timer modes (flagRush, streakBlitz) have timePerQuestion option', () => {
        const timerModes = ['flagRush', 'streakBlitz'];
        for (const modeId of timerModes) {
            const options = MODE_OPTIONS[modeId];
            const hasTimer = options.some(opt => opt.id === 'timePerQuestion');
            expect(hasTimer).toBe(true);
        }
    });

    it('team modes (banderaFlash, capitalQuest) do not have a teams option (teams count is fixed at 3)', () => {
        const teamModes = ['banderaFlash', 'capitalQuest'];
        for (const modeId of teamModes) {
            const options = MODE_OPTIONS[modeId];
            const hasTeams = options.some(opt => opt.id === 'teams');
            expect(hasTeams).toBe(false);
        }
    });

    it('capitalQuest and capitalClash have hint/variant option', () => {
        const capitalQuestOpts = MODE_OPTIONS.capitalQuest;
        expect(capitalQuestOpts.some(opt => opt.id === 'hintMode')).toBe(true);

        const capitalClashOpts = MODE_OPTIONS.capitalClash;
        expect(capitalClashOpts.some(opt => opt.id === 'variant')).toBe(true);
    });
});

describe('getOptionsForMode', () => {
    it('returns the options array for a valid mode', () => {
        const options = getOptionsForMode('flagRush');
        expect(options).toBe(MODE_OPTIONS.flagRush);
        expect(options).toHaveLength(1);
    });

    it('returns an empty array for an unknown mode', () => {
        const options = getOptionsForMode('nonExistentMode');
        expect(options).toEqual([]);
    });

    it('returns the correct options for each mode', () => {
        for (const modeId of Object.keys(GAME_MODES)) {
            const options = getOptionsForMode(modeId);
            expect(options).toBe(MODE_OPTIONS[modeId]);
        }
    });
});
