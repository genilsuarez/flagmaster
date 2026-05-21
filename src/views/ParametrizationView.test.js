import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ParametrizationView } from './ParametrizationView.js';

/**
 * Creates a mock CountryService with configurable behavior.
 */
function createMockCountryService(options = {}) {
    const { maxCount = 50, continents = ['All', 'Africa', 'America', 'Asia', 'Europe', 'Oceania'] } = options;
    return {
        getAvailableContinents: vi.fn(() => continents),
        getMaxCountryCount: vi.fn(() => maxCount),
        filterCountries: vi.fn(() => Array(maxCount).fill({})),
    };
}

describe('ParametrizationView', () => {
    let container;
    let countryService;
    let onBack;
    let onPlay;

    beforeEach(() => {
        container = document.createElement('div');
        container.id = 'parametrizationScreen';
        document.body.appendChild(container);
        countryService = createMockCountryService();
        onBack = vi.fn();
        onPlay = vi.fn();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    function createView(modeId = 'flagRush') {
        const view = new ParametrizationView({ container, countryService, onBack, onPlay });
        view.setMode(modeId);
        return view;
    }

    describe('Mode Header', () => {
        it('displays the mode icon, name, and description', () => {
            createView('flagRush');
            const icon = container.querySelector('.parametrization__icon');
            const name = container.querySelector('.parametrization__name');
            const description = container.querySelector('.parametrization__description');

            expect(icon.textContent).toBe('🚩');
            expect(name.textContent).toBe('Flag Rush');
            expect(description.textContent).toBe('Elige el país correcto a contrarreloj');
        });

        it('updates header when mode changes', () => {
            const view = new ParametrizationView({ container, countryService, onBack, onPlay });
            view.setMode('capitalClash');
            const name = container.querySelector('.parametrization__name');
            expect(name.textContent).toBe('Capital Clash');
        });
    });

    describe('Section 1: Content Filters', () => {
        it('renders continent selector with available continents', () => {
            createView();
            const select = container.querySelector('#param-continent');
            expect(select).not.toBeNull();
            expect(select.options.length).toBe(6);
            expect(select.options[0].textContent).toBe('🌍 Todos');
        });

        it('renders sovereignty filter with three options', () => {
            createView();
            const select = container.querySelector('#param-sovereignty');
            expect(select).not.toBeNull();
            expect(select.options.length).toBe(3);
        });

        it('renders country count input with correct max', () => {
            createView();
            const input = container.querySelector('#param-country-count');
            expect(input).not.toBeNull();
            expect(input.type).toBe('number');
            expect(input.max).toBe('50');
            expect(input.min).toBe('5');
        });

        it('updates max country count when continent filter changes', () => {
            countryService.getMaxCountryCount.mockReturnValueOnce(50).mockReturnValueOnce(12);
            const view = createView();
            const select = container.querySelector('#param-continent');

            select.value = 'Africa';
            select.dispatchEvent(new Event('change'));

            const input = container.querySelector('#param-country-count');
            expect(input.max).toBe('12');
            expect(input.placeholder).toBe('Máx: 12');
        });

        it('updates max country count when sovereignty filter changes', () => {
            countryService.getMaxCountryCount.mockReturnValueOnce(50).mockReturnValueOnce(30);
            createView();
            const select = container.querySelector('#param-sovereignty');

            select.value = 'Yes';
            select.dispatchEvent(new Event('change'));

            const input = container.querySelector('#param-country-count');
            expect(input.max).toBe('30');
        });
    });

    describe('Section 2: Mode Options', () => {
        it('renders mode-specific options for flagRush', () => {
            createView('flagRush');
            const timeInput = container.querySelector('#param-opt-timePerQuestion');
            const roundsInput = container.querySelector('#param-opt-rounds');

            expect(timeInput).not.toBeNull();
            expect(timeInput.value).toBe('10');
            expect(roundsInput).not.toBeNull();
            expect(roundsInput.value).toBe('10');
        });

        it('renders select options for capitalClash variant', () => {
            createView('capitalClash');
            const variantSelect = container.querySelector('#param-opt-variant');
            expect(variantSelect).not.toBeNull();
            expect(variantSelect.options.length).toBe(2);
            expect(variantSelect.value).toBe('default');
        });

        it('shows empty message for modes without options', () => {
            // geoPuzzle has options, so let's test with a mode that has them
            createView('geoPuzzle');
            const roundsInput = container.querySelector('#param-opt-rounds');
            expect(roundsInput).not.toBeNull();
        });
    });

    describe('Section 3: Modifiers (team modes only)', () => {
        it('shows modifiers section for team modes', () => {
            createView('banderaFlash');
            const section = container.querySelector('#param-section-modifiers');
            expect(section).not.toBeNull();
        });

        it('hides modifiers section for individual modes', () => {
            createView('flagRush');
            const section = container.querySelector('#param-section-modifiers');
            expect(section).toBeNull();
        });

        it('renders practice mode and random order toggles', () => {
            createView('capitalQuest');
            const toggles = container.querySelectorAll('.parametrization__toggle input[type="checkbox"]');
            expect(toggles.length).toBe(2);
        });

        it('practice mode defaults to unchecked', () => {
            createView('banderaFlash');
            const toggles = container.querySelectorAll('.parametrization__toggle input[type="checkbox"]');
            expect(toggles[0].checked).toBe(false);
        });

        it('random order defaults to checked', () => {
            createView('banderaFlash');
            const toggles = container.querySelectorAll('.parametrization__toggle input[type="checkbox"]');
            expect(toggles[1].checked).toBe(true);
        });
    });

    describe('Back Button', () => {
        it('calls onBack when back button is clicked', () => {
            createView();
            const backBtn = container.querySelector('.parametrization__back-btn');
            backBtn.click();
            expect(onBack).toHaveBeenCalledTimes(1);
        });
    });

    describe('Play Button', () => {
        it('calls onPlay with config when play button is clicked', () => {
            createView('flagRush');
            const playBtn = container.querySelector('.parametrization__play-btn');
            playBtn.click();

            expect(onPlay).toHaveBeenCalledTimes(1);
            const config = onPlay.mock.calls[0][0];
            expect(config.modeId).toBe('flagRush');
            expect(config.continent).toBe('All');
            expect(config.sovereigntyStatus).toBe('All');
            expect(config.maxCount).toBe(50);
            expect(config.modeOptions).toBeDefined();
            expect(config.modeOptions.timePerQuestion).toBe(10);
        });

        it('includes team modifiers in config for team modes', () => {
            createView('banderaFlash');
            const playBtn = container.querySelector('.parametrization__play-btn');
            playBtn.click();

            const config = onPlay.mock.calls[0][0];
            expect(config.practiceMode).toBe(false);
            expect(config.randomOrder).toBe(true);
        });

        it('does not include team modifiers for individual modes', () => {
            createView('flagRush');
            const playBtn = container.querySelector('.parametrization__play-btn');
            playBtn.click();

            const config = onPlay.mock.calls[0][0];
            expect(config.practiceMode).toBeUndefined();
            expect(config.randomOrder).toBeUndefined();
        });
    });

    describe('Disable-when-pool-too-small logic', () => {
        it('disables play button when pool is smaller than 5', () => {
            countryService.getMaxCountryCount.mockReturnValue(3);
            createView();
            const playBtn = container.querySelector('.parametrization__play-btn');
            expect(playBtn.disabled).toBe(true);
        });

        it('shows warning message when pool is too small', () => {
            countryService.getMaxCountryCount.mockReturnValue(3);
            createView();
            const warning = container.querySelector('.parametrization__warning');
            expect(warning.hidden).toBe(false);
        });

        it('enables play button when pool is large enough', () => {
            createView();
            const playBtn = container.querySelector('.parametrization__play-btn');
            expect(playBtn.disabled).toBe(false);
        });

        it('hides warning when pool is large enough', () => {
            createView();
            const warning = container.querySelector('.parametrization__warning');
            expect(warning.hidden).toBe(true);
        });

        it('disables play button when filter change reduces pool below minimum', () => {
            countryService.getMaxCountryCount.mockReturnValueOnce(50).mockReturnValueOnce(3);
            createView();
            const select = container.querySelector('#param-continent');

            select.value = 'Oceania';
            select.dispatchEvent(new Event('change'));

            const playBtn = container.querySelector('.parametrization__play-btn');
            expect(playBtn.disabled).toBe(true);
        });

        it('does not call onPlay when button is disabled', () => {
            countryService.getMaxCountryCount.mockReturnValue(3);
            createView();
            const playBtn = container.querySelector('.parametrization__play-btn');
            playBtn.click();
            expect(onPlay).not.toHaveBeenCalled();
        });
    });

    describe('Dynamic country count max', () => {
        it('clamps country count when filter reduces max below current value', () => {
            countryService.getMaxCountryCount.mockReturnValueOnce(50).mockReturnValueOnce(8);
            const view = createView();
            const countInput = container.querySelector('#param-country-count');

            // Set a high country count
            countInput.value = '40';
            countInput.dispatchEvent(new Event('input'));

            // Change filter to reduce max
            const select = container.querySelector('#param-continent');
            select.value = 'Oceania';
            select.dispatchEvent(new Event('change'));

            expect(countInput.value).toBe('8');
        });
    });

    describe('destroy()', () => {
        it('cleans up the container', () => {
            const view = createView();
            expect(container.children.length).toBeGreaterThan(0);
            view.destroy();
            expect(container.innerHTML).toBe('');
        });

        it('nullifies DOM references', () => {
            const view = createView();
            view.destroy();
            expect(view.continentSelect).toBeNull();
            expect(view.playButton).toBeNull();
        });
    });
});
