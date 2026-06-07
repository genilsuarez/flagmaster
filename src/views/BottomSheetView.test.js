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
            ready: vi.fn(() => Promise.resolve()),
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
        it('initializes with isOpen = false', async () => {
            expect(view.isOpen).toBe(false);
        });

        it('stores countryService reference', async () => {
            expect(view.countryService).toBe(countryService);
        });

        it('has static STORAGE_KEY', async () => {
            expect(BottomSheetView.STORAGE_KEY).toBe('flagquiz_mode_config_');
        });
    });

    describe('open()', () => {
        it('creates backdrop and sheet elements in the DOM', async () => {
            await view.open('flagRush');
            expect(document.querySelector('.bottom-sheet__backdrop')).not.toBeNull();
            expect(document.querySelector('.bottom-sheet[role="dialog"]')).not.toBeNull();
        });

        it('sets role="dialog" and aria-modal="true" on the sheet', async () => {
            await view.open('flagRush');
            const sheet = document.querySelector('.bottom-sheet');
            expect(sheet.getAttribute('role')).toBe('dialog');
            expect(sheet.getAttribute('aria-modal')).toBe('true');
        });

        it('sets aria-label with mode name', async () => {
            await view.open('flagRush');
            const sheet = document.querySelector('.bottom-sheet[role="dialog"]');
            expect(sheet.getAttribute('aria-label')).toBe('Configuración: Carrera de Banderas');
        });

        it('sets isOpen to true', async () => {
            await view.open('flagRush');
            expect(view.isOpen).toBe(true);
        });

        it('renders mode header with icon and name', async () => {
            await view.open('capitalClash');
            const icon = document.querySelector('.bottom-sheet__mode-icon');
            const title = document.querySelector('.bottom-sheet__title');
            expect(icon.textContent).toBe('⚔️');
            expect(title.textContent).toBe('Duelo de Capitales');
        });

        it('renders content filter controls', async () => {
            await view.open('flagRush');
            expect(document.getElementById('bs-continent')).not.toBeNull();
            expect(document.getElementById('bs-sovereignty')).not.toBeNull();
            expect(document.getElementById('bs-country-count')).not.toBeNull();
        });

        it('renders mode-specific options for flagRush', async () => {
            await view.open('flagRush');
            expect(document.getElementById('bs-opt-timePerQuestion')).not.toBeNull();
        });

        it('renders chip group for capitalClash variant (2 options → chips)', async () => {
            await view.open('capitalClash');
            // variant has 2 options → should render as chip-group, not select
            const variantSelect = document.getElementById('bs-opt-variant');
            expect(variantSelect).toBeNull(); // no select element
            const chipGroup = document.querySelector('.chip-group[aria-label="Variante"]');
            expect(chipGroup).not.toBeNull();
            expect(chipGroup.querySelectorAll('.chip').length).toBe(2);
        });

        it('renders modifiers section for team modes', async () => {
            await view.open('banderaFlash');
            const toggles = document.querySelectorAll('.bottom-sheet__toggle');
            expect(toggles.length).toBe(2); // practice + random order
        });

        it('does not render modifiers section for individual modes', async () => {
            await view.open('flagRush');
            const toggles = document.querySelectorAll('.bottom-sheet__toggle');
            expect(toggles.length).toBe(0);
        });

        it('renders play button', async () => {
            await view.open('flagRush');
            const playBtn = document.querySelector('.bottom-sheet__play-btn');
            expect(playBtn).not.toBeNull();
            expect(playBtn.textContent).toBe('Jugar');
        });

        it('renders close button', async () => {
            await view.open('flagRush');
            const closeBtn = document.querySelector('.bottom-sheet__close-btn');
            expect(closeBtn).not.toBeNull();
        });

        it('does nothing for invalid modeId', async () => {
            await view.open('nonExistentMode');
            expect(view.isOpen).toBe(false);
            expect(document.querySelector('.bottom-sheet[role="dialog"]')).toBeNull();
        });
    });

    describe('close()', () => {
        it('sets isOpen to false', async () => {
            await view.open('flagRush');
            view.close();
            expect(view.isOpen).toBe(false);
        });

        it('calls onDismiss callback', async () => {
            await view.open('flagRush');
            view.close();
            expect(onDismiss).toHaveBeenCalled();
        });

        it('restores focus to trigger element', async () => {
            const button = document.createElement('button');
            document.body.appendChild(button);
            button.focus();

            await view.open('flagRush');
            view.close();

            expect(document.activeElement).toBe(button);
        });

        it('does nothing if not open', async () => {
            view.close();
            expect(onDismiss).not.toHaveBeenCalled();
        });
    });

    describe('_loadSavedConfig()', () => {
        it('loads saved modeOptions from localStorage (filters are not per-mode)', async () => {
            const config = {
                modeOptions: { timePerQuestion: 15, rounds: 20 },
            };
            localStorage.setItem('flagquiz_mode_config_flagRush', JSON.stringify(config));

            await view.open('flagRush');

            // Filters come from globalDefaults, not per-mode storage
            expect(view.continent).toBe('All');
            expect(view.sovereigntyStatus).toBe('All');
            expect(view.countryCount).toBeNull();
            // modeOptions are per-mode
            expect(view.modeOptions.timePerQuestion).toBe(15);
            expect(view.modeOptions.rounds).toBe(20);
        });

        it('ignores continent/sovereigntyStatus stored in old per-mode format', async () => {
            // Old format had filters stored per-mode — they should be ignored now
            const config = {
                continent: 'Europe',
                sovereigntyStatus: 'Yes',
                maxCount: 20,
                modeOptions: { timePerQuestion: 15, rounds: 20 },
            };
            localStorage.setItem('flagquiz_mode_config_flagRush', JSON.stringify(config));

            await view.open('flagRush');

            expect(view.continent).toBe('All');       // from globalDefaults, not per-mode
            expect(view.sovereigntyStatus).toBe('All');
            expect(view.countryCount).toBeNull();
            expect(view.modeOptions.timePerQuestion).toBe(15); // modeOptions still loaded
        });

        it('uses defaults when no saved config exists', async () => {
            await view.open('flagRush');
            expect(view.continent).toBe('All');
            expect(view.sovereigntyStatus).toBe('All');
            expect(view.countryCount).toBeNull();
        });

        it('handles invalid JSON gracefully', async () => {
            localStorage.setItem('flagquiz_mode_config_flagRush', 'not-json');
            await expect(view.open('flagRush')).resolves.not.toThrow();
            expect(view.continent).toBe('All');
        });

        it('loads team mode modifiers', async () => {
            const config = {
                continent: 'All',
                sovereigntyStatus: 'All',
                practiceMode: true,
                randomOrder: false,
            };
            localStorage.setItem('flagquiz_mode_config_banderaFlash', JSON.stringify(config));

            await view.open('banderaFlash');
            expect(view.practiceMode).toBe(true);
            expect(view.randomOrder).toBe(false);
        });
    });

    describe('_saveConfig()', () => {
        it('saves only modeOptions to localStorage (not filters)', async () => {
            await view.open('flagRush');
            view.continent = 'Asia'; // this should NOT be saved per-mode
            view.close();

            const saved = JSON.parse(localStorage.getItem('flagquiz_mode_config_flagRush'));
            expect(saved.continent).toBeUndefined();
            expect(saved.modeId).toBeUndefined();
            expect(saved.modeOptions).toBeDefined();
        });
    });

    describe('_buildConfig()', () => {
        it('returns config object with all fields', async () => {
            await view.open('flagRush');
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

        it('includes team modifiers for team modes', async () => {
            await view.open('banderaFlash');
            view.practiceMode = true;
            view.randomOrder = false;

            const config = view._buildConfig();
            expect(config.practiceMode).toBe(true);
            expect(config.randomOrder).toBe(false);
        });

        it('does not include team modifiers for individual modes', async () => {
            await view.open('flagRush');
            const config = view._buildConfig();
            expect(config.practiceMode).toBeUndefined();
            expect(config.randomOrder).toBeUndefined();
        });

        it('uses maxCountryCount when countryCount is null', async () => {
            countryService.getMaxCountryCount.mockReturnValue(50);
            await view.open('flagRush');
            view.countryCount = null;

            const config = view._buildConfig();
            // null means "no limit" — use all available countries
            expect(config.maxCount).toBeNull();
        });
    });

    describe('_updatePlayButtonState()', () => {
        it('disables play button when pool < 5', async () => {
            countryService.getMaxCountryCount.mockReturnValue(3);
            await view.open('flagRush');

            expect(view.playButton.disabled).toBe(true);
            expect(view.poolWarning.hidden).toBe(false);
        });

        it('enables play button when pool >= 5', async () => {
            countryService.getMaxCountryCount.mockReturnValue(50);
            await view.open('flagRush');

            expect(view.playButton.disabled).toBe(false);
            expect(view.poolWarning.hidden).toBe(true);
        });

        it('shows warning message when pool is too small', async () => {
            countryService.getMaxCountryCount.mockReturnValue(2);
            await view.open('flagRush');

            expect(view.poolWarning.hidden).toBe(false);
            expect(view.poolWarning.textContent).toContain('al menos 5 países');
        });
    });

    describe('focus trap', () => {
        it('closes on Escape key', async () => {
            await view.open('flagRush');
            const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
            document.dispatchEvent(event);
            expect(view.isOpen).toBe(false);
        });
    });

    describe('backdrop click', () => {
        it('closes when backdrop is clicked', async () => {
            await view.open('flagRush');
            const backdrop = document.querySelector('.bottom-sheet__backdrop');
            backdrop.click();
            expect(view.isOpen).toBe(false);
        });
    });

    describe('play button', () => {
        it('calls onPlay with config when clicked', async () => {
            countryService.getMaxCountryCount.mockReturnValue(50);
            await view.open('flagRush');

            const playBtn = document.querySelector('.bottom-sheet__play-btn');
            playBtn.click();

            expect(onPlay).toHaveBeenCalledWith(expect.objectContaining({
                modeId: 'flagRush',
                continent: 'All',
                sovereigntyStatus: 'All',
            }));
        });

        it('does not call onPlay when disabled', async () => {
            countryService.getMaxCountryCount.mockReturnValue(2);
            await view.open('flagRush');

            const playBtn = document.querySelector('.bottom-sheet__play-btn');
            playBtn.click();

            expect(onPlay).not.toHaveBeenCalled();
        });
    });

    describe('filter changes', () => {
        it('updates maxCountryCount when continent changes', async () => {
            countryService.getMaxCountryCount
                .mockReturnValueOnce(195) // initial
                .mockReturnValueOnce(54); // after filter

            await view.open('flagRush');
            view.continentSelect.value = 'Africa';
            view.continentSelect.dispatchEvent(new Event('change'));

            expect(countryService.getMaxCountryCount).toHaveBeenCalledWith({
                continent: 'Africa',
                sovereigntyStatus: 'All',
            });
        });

        it('clamps country count when it exceeds new max', async () => {
            countryService.getMaxCountryCount
                .mockReturnValueOnce(195) // initial
                .mockReturnValueOnce(10); // after filter

            await view.open('flagRush');
            view.countryCount = 50;
            view.countryCountInput.value = '50';

            view.continentSelect.value = 'Oceania';
            view.continentSelect.dispatchEvent(new Event('change'));

            expect(view.countryCount).toBe(10);
        });
    });

    describe('ordenaContinente multiSelect and validation', () => {
        beforeEach(() => {
            // Mock getMaxCountryCount to return different values per continent
            countryService.getMaxCountryCount.mockImplementation(({ continent, sovereigntyStatus }) => {
                if (continent === 'All' || !continent) return 195;
                if (sovereigntyStatus === 'Yes') {
                    const counts = { Africa: 54, America: 35, Asia: 48, Europe: 44, Oceania: 14 };
                    return counts[continent] || 0;
                }
                return 195;
            });
        });

        it('renders multiSelect chip group for continents option', async () => {
            await view.open('ordenaContinente');
            const chipGroup = document.querySelector('.chip-group--multi[aria-label="Continentes"]');
            expect(chipGroup).not.toBeNull();
            expect(chipGroup.querySelectorAll('.chip').length).toBe(5);
        });

        it('all continents are selected by default', async () => {
            await view.open('ordenaContinente');
            const chipGroup = document.querySelector('.chip-group--multi[aria-label="Continentes"]');
            const selectedChips = chipGroup.querySelectorAll('.chip--selected');
            expect(selectedChips.length).toBe(5);
        });

        it('toggling a chip deselects it', async () => {
            await view.open('ordenaContinente');
            const chipGroup = document.querySelector('.chip-group--multi[aria-label="Continentes"]');
            const africaChip = chipGroup.querySelector('[data-value="Africa"]');
            africaChip.click();

            expect(africaChip.classList.contains('chip--selected')).toBe(false);
            expect(africaChip.getAttribute('aria-pressed')).toBe('false');
            expect(view.modeOptions.continents).not.toContain('Africa');
        });

        it('toggling a deselected chip selects it', async () => {
            await view.open('ordenaContinente');
            // First deselect Africa
            const chipGroup = document.querySelector('.chip-group--multi[aria-label="Continentes"]');
            const africaChip = chipGroup.querySelector('[data-value="Africa"]');
            africaChip.click();
            expect(view.modeOptions.continents).not.toContain('Africa');

            // Then re-select it
            africaChip.click();
            expect(africaChip.classList.contains('chip--selected')).toBe(true);
            expect(africaChip.getAttribute('aria-pressed')).toBe('true');
            expect(view.modeOptions.continents).toContain('Africa');
        });

        it('disables play button when fewer than 2 continents selected', async () => {
            await view.open('ordenaContinente');
            const chipGroup = document.querySelector('.chip-group--multi[aria-label="Continentes"]');

            // Deselect all but one
            ['Africa', 'America', 'Asia', 'Europe'].forEach(val => {
                chipGroup.querySelector(`[data-value="${val}"]`).click();
            });

            expect(view.modeOptions.continents).toEqual(['Oceania']);
            expect(view.playButton.disabled).toBe(true);
        });

        it('shows warning message when fewer than 2 continents selected', async () => {
            await view.open('ordenaContinente');
            const chipGroup = document.querySelector('.chip-group--multi[aria-label="Continentes"]');

            // Deselect all but one
            ['Africa', 'America', 'Asia', 'Europe'].forEach(val => {
                chipGroup.querySelector(`[data-value="${val}"]`).click();
            });

            const warning = document.querySelector('.bottom-sheet__warning[role="alert"]');
            // Find the continents-specific warning
            const continentsWarning = view._continentsWarning;
            expect(continentsWarning).not.toBeNull();
            expect(continentsWarning.hidden).toBe(false);
            expect(continentsWarning.textContent).toContain('al menos 2 continentes');
        });

        it('hides warning and enables play when 2+ continents selected', async () => {
            await view.open('ordenaContinente');
            const chipGroup = document.querySelector('.chip-group--multi[aria-label="Continentes"]');

            // Deselect all but one
            ['Africa', 'America', 'Asia', 'Europe'].forEach(val => {
                chipGroup.querySelector(`[data-value="${val}"]`).click();
            });
            expect(view.playButton.disabled).toBe(true);

            // Re-select one more
            chipGroup.querySelector('[data-value="Asia"]').click();
            expect(view.modeOptions.continents.length).toBe(2);
            expect(view.playButton.disabled).toBe(false);
            expect(view._continentsWarning.hidden).toBe(true);
        });

        it('adjusts itemCount max dynamically based on selected continents', async () => {
            await view.open('ordenaContinente');
            const itemCountInput = document.getElementById('bs-opt-itemCount');
            // All continents selected: 54 + 35 + 48 + 44 + 14 = 195
            expect(itemCountInput.max).toBe('195');
        });

        it('reduces itemCount max when continents are deselected', async () => {
            await view.open('ordenaContinente');
            const chipGroup = document.querySelector('.chip-group--multi[aria-label="Continentes"]');
            const itemCountInput = document.getElementById('bs-opt-itemCount');

            // Deselect Africa (54) and America (35) → remaining: 48 + 44 + 14 = 106
            chipGroup.querySelector('[data-value="Africa"]').click();
            chipGroup.querySelector('[data-value="America"]').click();

            expect(itemCountInput.max).toBe('106');
        });

        it('clamps itemCount value when it exceeds new dynamic max', async () => {
            await view.open('ordenaContinente');
            const chipGroup = document.querySelector('.chip-group--multi[aria-label="Continentes"]');
            const itemCountInput = document.getElementById('bs-opt-itemCount');

            // Set itemCount to a high value
            view.modeOptions.itemCount = 60;
            itemCountInput.value = '60';

            // Deselect Africa (54), America (35), Asia (48) → remaining: Europe (44) + Oceania (14) = 58
            chipGroup.querySelector('[data-value="Africa"]').click();
            chipGroup.querySelector('[data-value="America"]').click();
            chipGroup.querySelector('[data-value="Asia"]').click();

            // max = 44 + 14 = 58, itemCount was 60 → should clamp to 58
            expect(view.modeOptions.itemCount).toBe(58);
            expect(itemCountInput.value).toBe('58');
        });

        it('_buildConfig clamps itemCount to dynamic max for ordenaContinente', async () => {
            await view.open('ordenaContinente');
            // Only select Oceania (14) and Europe (44) → max = 58
            view.modeOptions.continents = ['Oceania', 'Europe'];
            view.modeOptions.itemCount = 100; // exceeds dynamic max

            const config = view._buildConfig();
            expect(config.modeOptions.itemCount).toBe(58);
        });
    });
});
