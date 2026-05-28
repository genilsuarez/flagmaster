import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BottomSheetView } from './BottomSheetView.js';

describe('BottomSheetView', () => {
    let countryService;
    let onPlay;
    let onDismiss;
    let view;

    beforeEach(() => {
        countryService = {
            getAvailableContinents: vi.fn(() => ['All', 'Africa', 'America', 'Asia', 'Europe', 'Oceania']),
            getMaxCountryCount: vi.fn(() => 195),
        };
        onPlay = vi.fn();
        onDismiss = vi.fn();
        view = new BottomSheetView({ countryService, onPlay, onDismiss });
    });

    afterEach(() => {
        if (view.isOpen) {
            // Force cleanup without animation
            view.isOpen = false;
            view._cleanup();
        }
        document.body.innerHTML = '';
        localStorage.clear();
    });

    describe('constructor', () => {
        it('initializes with isOpen = false', () => {
            expect(view.isOpen).toBe(false);
        });

        it('stores countryService reference', () => {
            expect(view.countryService).toBe(countryService);
        });

        it('has static STORAGE_KEY', () => {
            expect(BottomSheetView.STORAGE_KEY).toBe('flagquiz_mode_config_');
        });
    });

    describe('open()', () => {
        it('creates backdrop and sheet elements in the DOM', () => {
            view.open('flagRush');
            expect(document.querySelector('.bottom-sheet__backdrop')).not.toBeNull();
            expect(document.querySelector('.bottom-sheet[role="dialog"]')).not.toBeNull();
        });

        it('sets role="dialog" and aria-modal="true" on the sheet', () => {
            view.open('flagRush');
            const sheet = document.querySelector('.bottom-sheet');
            expect(sheet.getAttribute('role')).toBe('dialog');
            expect(sheet.getAttribute('aria-modal')).toBe('true');
        });

        it('sets aria-label with mode name', () => {
            view.open('flagRush');
            const sheet = document.querySelector('.bottom-sheet[role="dialog"]');
            expect(sheet.getAttribute('aria-label')).toBe('Configuración: Carrera de Banderas');
        });

        it('sets isOpen to true', () => {
            view.open('flagRush');
            expect(view.isOpen).toBe(true);
        });

        it('renders mode header with icon and name', () => {
            view.open('capitalClash');
            const icon = document.querySelector('.bottom-sheet__mode-icon');
            const title = document.querySelector('.bottom-sheet__title');
            expect(icon.textContent).toBe('⚔️');
            expect(title.textContent).toBe('Duelo de Capitales');
        });

        it('renders content filter controls', () => {
            view.open('flagRush');
            expect(document.getElementById('bs-continent')).not.toBeNull();
            expect(document.getElementById('bs-sovereignty')).not.toBeNull();
            expect(document.getElementById('bs-country-count')).not.toBeNull();
        });

        it('renders mode-specific options for flagRush', () => {
            view.open('flagRush');
            expect(document.getElementById('bs-opt-timePerQuestion')).not.toBeNull();
            expect(document.getElementById('bs-opt-rounds')).not.toBeNull();
        });

        it('renders select options for capitalClash variant', () => {
            view.open('capitalClash');
            const variantSelect = document.getElementById('bs-opt-variant');
            expect(variantSelect).not.toBeNull();
            expect(variantSelect.tagName).toBe('SELECT');
        });

        it('renders modifiers section for team modes', () => {
            view.open('banderaFlash');
            const toggles = document.querySelectorAll('.bottom-sheet__toggle');
            expect(toggles.length).toBe(2); // practice + random order
        });

        it('does not render modifiers section for individual modes', () => {
            view.open('flagRush');
            const toggles = document.querySelectorAll('.bottom-sheet__toggle');
            expect(toggles.length).toBe(0);
        });

        it('renders play button', () => {
            view.open('flagRush');
            const playBtn = document.querySelector('.bottom-sheet__play-btn');
            expect(playBtn).not.toBeNull();
            expect(playBtn.textContent).toBe('Jugar');
        });

        it('renders close button', () => {
            view.open('flagRush');
            const closeBtn = document.querySelector('.bottom-sheet__close-btn');
            expect(closeBtn).not.toBeNull();
        });

        it('does nothing for invalid modeId', () => {
            view.open('nonExistentMode');
            expect(view.isOpen).toBe(false);
            expect(document.querySelector('.bottom-sheet[role="dialog"]')).toBeNull();
        });
    });

    describe('close()', () => {
        it('sets isOpen to false', () => {
            view.open('flagRush');
            view.close();
            expect(view.isOpen).toBe(false);
        });

        it('calls onDismiss callback', () => {
            view.open('flagRush');
            view.close();
            expect(onDismiss).toHaveBeenCalled();
        });

        it('restores focus to trigger element', () => {
            const button = document.createElement('button');
            document.body.appendChild(button);
            button.focus();

            view.open('flagRush');
            view.close();

            expect(document.activeElement).toBe(button);
        });

        it('does nothing if not open', () => {
            view.close();
            expect(onDismiss).not.toHaveBeenCalled();
        });
    });

    describe('_loadSavedConfig()', () => {
        it('loads saved modeOptions from localStorage (filters are not per-mode)', () => {
            const config = {
                modeOptions: { timePerQuestion: 15, rounds: 20 },
            };
            localStorage.setItem('flagquiz_mode_config_flagRush', JSON.stringify(config));

            view.open('flagRush');

            // Filters come from globalDefaults, not per-mode storage
            expect(view.continent).toBe('All');
            expect(view.sovereigntyStatus).toBe('All');
            expect(view.countryCount).toBeNull();
            // modeOptions are per-mode
            expect(view.modeOptions.timePerQuestion).toBe(15);
            expect(view.modeOptions.rounds).toBe(20);
        });

        it('ignores continent/sovereigntyStatus stored in old per-mode format', () => {
            // Old format had filters stored per-mode — they should be ignored now
            const config = {
                continent: 'Europe',
                sovereigntyStatus: 'Yes',
                maxCount: 20,
                modeOptions: { timePerQuestion: 15, rounds: 20 },
            };
            localStorage.setItem('flagquiz_mode_config_flagRush', JSON.stringify(config));

            view.open('flagRush');

            expect(view.continent).toBe('All');       // from globalDefaults, not per-mode
            expect(view.sovereigntyStatus).toBe('All');
            expect(view.countryCount).toBeNull();
            expect(view.modeOptions.timePerQuestion).toBe(15); // modeOptions still loaded
        });

        it('uses defaults when no saved config exists', () => {
            view.open('flagRush');
            expect(view.continent).toBe('All');
            expect(view.sovereigntyStatus).toBe('All');
            expect(view.countryCount).toBeNull();
        });

        it('handles invalid JSON gracefully', () => {
            localStorage.setItem('flagquiz_mode_config_flagRush', 'not-json');
            expect(() => view.open('flagRush')).not.toThrow();
            expect(view.continent).toBe('All');
        });

        it('loads team mode modifiers', () => {
            const config = {
                continent: 'All',
                sovereigntyStatus: 'All',
                practiceMode: true,
                randomOrder: false,
            };
            localStorage.setItem('flagquiz_mode_config_banderaFlash', JSON.stringify(config));

            view.open('banderaFlash');
            expect(view.practiceMode).toBe(true);
            expect(view.randomOrder).toBe(false);
        });
    });

    describe('_saveConfig()', () => {
        it('saves only modeOptions to localStorage (not filters)', () => {
            view.open('flagRush');
            view.continent = 'Asia'; // this should NOT be saved per-mode
            view.close();

            const saved = JSON.parse(localStorage.getItem('flagquiz_mode_config_flagRush'));
            expect(saved.continent).toBeUndefined();
            expect(saved.modeId).toBeUndefined();
            expect(saved.modeOptions).toBeDefined();
        });
    });

    describe('_buildConfig()', () => {
        it('returns config object with all fields', () => {
            view.open('flagRush');
            view.continent = 'Europe';
            view.sovereigntyStatus = 'Yes';
            view.countryCount = 30;

            const config = view._buildConfig();
            expect(config.modeId).toBe('flagRush');
            expect(config.continent).toBe('Europe');
            expect(config.sovereigntyStatus).toBe('Yes');
            expect(config.maxCount).toBe(30);
            expect(config.modeOptions).toBeDefined();
        });

        it('includes team modifiers for team modes', () => {
            view.open('banderaFlash');
            view.practiceMode = true;
            view.randomOrder = false;

            const config = view._buildConfig();
            expect(config.practiceMode).toBe(true);
            expect(config.randomOrder).toBe(false);
        });

        it('does not include team modifiers for individual modes', () => {
            view.open('flagRush');
            const config = view._buildConfig();
            expect(config.practiceMode).toBeUndefined();
            expect(config.randomOrder).toBeUndefined();
        });

        it('uses maxCountryCount when countryCount is null', () => {
            countryService.getMaxCountryCount.mockReturnValue(50);
            view.open('flagRush');
            view.countryCount = null;

            const config = view._buildConfig();
            expect(config.maxCount).toBe(50);
        });
    });

    describe('_updatePlayButtonState()', () => {
        it('disables play button when pool < 5', () => {
            countryService.getMaxCountryCount.mockReturnValue(3);
            view.open('flagRush');

            expect(view.playButton.disabled).toBe(true);
            expect(view.poolWarning.hidden).toBe(false);
        });

        it('enables play button when pool >= 5', () => {
            countryService.getMaxCountryCount.mockReturnValue(50);
            view.open('flagRush');

            expect(view.playButton.disabled).toBe(false);
            expect(view.poolWarning.hidden).toBe(true);
        });

        it('shows warning message when pool is too small', () => {
            countryService.getMaxCountryCount.mockReturnValue(2);
            view.open('flagRush');

            expect(view.poolWarning.hidden).toBe(false);
            expect(view.poolWarning.textContent).toContain('al menos 5 países');
        });
    });

    describe('focus trap', () => {
        it('closes on Escape key', () => {
            view.open('flagRush');
            const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
            document.dispatchEvent(event);
            expect(view.isOpen).toBe(false);
        });
    });

    describe('backdrop click', () => {
        it('closes when backdrop is clicked', () => {
            view.open('flagRush');
            const backdrop = document.querySelector('.bottom-sheet__backdrop');
            backdrop.click();
            expect(view.isOpen).toBe(false);
        });
    });

    describe('play button', () => {
        it('calls onPlay with config when clicked', () => {
            countryService.getMaxCountryCount.mockReturnValue(50);
            view.open('flagRush');

            const playBtn = document.querySelector('.bottom-sheet__play-btn');
            playBtn.click();

            expect(onPlay).toHaveBeenCalledWith(expect.objectContaining({
                modeId: 'flagRush',
                continent: 'All',
                sovereigntyStatus: 'All',
            }));
        });

        it('does not call onPlay when disabled', () => {
            countryService.getMaxCountryCount.mockReturnValue(2);
            view.open('flagRush');

            const playBtn = document.querySelector('.bottom-sheet__play-btn');
            playBtn.click();

            expect(onPlay).not.toHaveBeenCalled();
        });
    });

    describe('filter changes', () => {
        it('updates maxCountryCount when continent changes', () => {
            countryService.getMaxCountryCount
                .mockReturnValueOnce(195) // initial
                .mockReturnValueOnce(54); // after filter

            view.open('flagRush');
            view.continentSelect.value = 'Africa';
            view.continentSelect.dispatchEvent(new Event('change'));

            expect(countryService.getMaxCountryCount).toHaveBeenCalledWith({
                continent: 'Africa',
                sovereigntyStatus: 'All',
            });
        });

        it('clamps country count when it exceeds new max', () => {
            countryService.getMaxCountryCount
                .mockReturnValueOnce(195) // initial
                .mockReturnValueOnce(10); // after filter

            view.open('flagRush');
            view.countryCount = 50;
            view.countryCountInput.value = '50';

            view.continentSelect.value = 'Oceania';
            view.continentSelect.dispatchEvent(new Event('change'));

            expect(view.countryCount).toBe(10);
        });
    });
});
