import { GAME_MODES } from '../models/ModeDefinition.js';

/**
 * Mode-specific option definitions.
 * Each mode can define its own set of configurable options.
 * @type {Object<string, Array<{id: string, label: string, type: string, options?: Array<{value: string, label: string}>, default: *, min?: number, max?: number}>>}
 */
const MODE_OPTIONS = {
    flagRush: [
        { id: 'timePerQuestion', label: 'Tiempo por pregunta (s)', type: 'number', default: 10, min: 5, max: 30 },
        { id: 'rounds', label: 'Número de rondas', type: 'number', default: 10, min: 5, max: 50 },
    ],
    capitalClash: [
        { id: 'timePerQuestion', label: 'Tiempo por pregunta (s)', type: 'number', default: 15, min: 5, max: 30 },
        { id: 'variant', label: 'Variante', type: 'select', options: [
            { value: 'default', label: 'País → Capital' },
            { value: 'inverse', label: 'Capital → País' },
        ], default: 'default' },
        { id: 'rounds', label: 'Número de rondas', type: 'number', default: 10, min: 5, max: 50 },
    ],
    streakBlitz: [
        { id: 'sessionTime', label: 'Tiempo de sesión (s)', type: 'number', default: 90, min: 30, max: 180 },
        { id: 'timePerQuestion', label: 'Tiempo por pregunta (s)', type: 'number', default: 10, min: 5, max: 20 },
    ],
    geoPuzzle: [
        { id: 'rounds', label: 'Número de rondas', type: 'number', default: 10, min: 3, max: 30 },
    ],
    supervivencia: [
        { id: 'timePerQuestion', label: 'Tiempo inicial (s)', type: 'number', default: 15, min: 10, max: 30 },
    ],
    banderaFlash: [
        { id: 'teams', label: 'Número de equipos', type: 'number', default: 2, min: 2, max: 4 },
    ],
    capitalQuest: [
        { id: 'teams', label: 'Número de equipos', type: 'number', default: 2, min: 2, max: 4 },
        { id: 'hintMode', label: 'Pista', type: 'select', options: [
            { value: 'flagAndName', label: 'Bandera + Nombre del país' },
            { value: 'flagOnly', label: 'Solo bandera' },
            { value: 'nameOnly', label: 'Solo nombre del país' },
        ], default: 'flagAndName' },
    ],
    letrasEnCaida: [
        { id: 'difficulty', label: 'Dificultad', type: 'select', options: [
            { value: 'easy', label: '🟢 Fácil — Con bandera' },
            { value: 'hard', label: '🔴 Difícil — Sin bandera' },
        ], default: 'easy' },
        { id: 'category', label: 'Categoría', type: 'select', options: [
            { value: 'country', label: '🌍 Países' },
            { value: 'capital', label: '🏛️ Capitales' },
        ], default: 'country' },
        { id: 'speed', label: 'Velocidad', type: 'select', options: [
            { value: 'slow', label: '🐢 Lento' },
            { value: 'normal', label: '⚡ Normal' },
            { value: 'fast', label: '🚀 Rápido' },
        ], default: 'normal' },
    ],
};

/** Minimum pool size required to start a game */
const MIN_POOL_SIZE = 5;

/**
 * View class for the Parametrization screen.
 * Renders mode header, content filters, mode-specific options,
 * modifiers (team modes only), and play/back actions.
 */
export class ParametrizationView {
    /**
     * @param {Object} options
     * @param {HTMLElement} [options.container] - DOM container (defaults to #parametrizationScreen)
     * @param {import('../services/CountryService.js').CountryService} options.countryService - Country service instance
     * @param {function(): void} options.onBack - Callback invoked when back button is pressed
     * @param {function(Object): void} options.onPlay - Callback invoked with config object when play is pressed
     */
    constructor({ container, countryService, onBack, onPlay }) {
        /** @type {HTMLElement} */
        this.container = container || document.getElementById('parametrizationScreen');
        /** @type {import('../services/CountryService.js').CountryService} */
        this.countryService = countryService;
        /** @type {function(): void} */
        this.onBack = onBack;
        /** @type {function(Object): void} */
        this.onPlay = onPlay;
        /** @type {string|null} */
        this.modeId = null;
        /** @type {Object|null} */
        this.mode = null;

        // Filter state
        /** @type {string} */
        this.continent = 'All';
        /** @type {string} */
        this.sovereigntyStatus = 'All';
        /** @type {number|null} */
        this.countryCount = null;
        /** @type {number} */
        this.maxCountryCount = 0;

        // Mode options state
        /** @type {Object} */
        this.modeOptions = {};

        // Modifier state (team modes only)
        /** @type {boolean} */
        this.practiceMode = false;
        /** @type {boolean} */
        this.randomOrder = true;

        // DOM references
        /** @type {HTMLSelectElement|null} */
        this.continentSelect = null;
        /** @type {HTMLSelectElement|null} */
        this.sovereigntySelect = null;
        /** @type {HTMLInputElement|null} */
        this.countryCountInput = null;
        /** @type {HTMLButtonElement|null} */
        this.playButton = null;
        /** @type {HTMLElement|null} */
        this.poolWarning = null;
    }

    /**
     * Sets the mode and renders the parametrization screen.
     * @param {string} modeId - The selected mode identifier
     */
    setMode(modeId) {
        this.modeId = modeId;
        this.mode = GAME_MODES[modeId] || null;

        // Initialize mode options with defaults
        this.modeOptions = {};
        const optionDefs = MODE_OPTIONS[modeId] || [];
        for (const opt of optionDefs) {
            this.modeOptions[opt.id] = opt.default;
        }

        this._updateMaxCountryCount();
        this.render();
    }

    /**
     * Renders the full parametrization screen.
     */
    render() {
        if (!this.container || !this.mode) return;

        this.container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'parametrization';

        wrapper.appendChild(this._createHeader());
        wrapper.appendChild(this._createSection1());
        wrapper.appendChild(this._createSection2());

        if (this.mode.category === 'team') {
            wrapper.appendChild(this._createSection3());
        }

        wrapper.appendChild(this._createFooter());

        this.container.appendChild(wrapper);
        this._updatePlayButtonState();
    }

    /**
     * Creates the mode header showing icon, name, and description.
     * @returns {HTMLElement}
     * @private
     */
    _createHeader() {
        const header = document.createElement('header');
        header.className = 'parametrization__header';

        const icon = document.createElement('span');
        icon.className = 'parametrization__icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = this.mode.icon;

        const info = document.createElement('div');
        info.className = 'parametrization__info';

        const name = document.createElement('h2');
        name.className = 'parametrization__name';
        name.textContent = this.mode.name;

        const description = document.createElement('p');
        description.className = 'parametrization__description';
        description.textContent = this.mode.description;

        info.appendChild(name);
        info.appendChild(description);
        header.appendChild(icon);
        header.appendChild(info);

        return header;
    }

    /**
     * Creates Section 1: Content Filters.
     * Includes continent selector, sovereignty filter, and country count input.
     * @returns {HTMLElement}
     * @private
     */
    _createSection1() {
        const section = document.createElement('section');
        section.className = 'parametrization__section';
        section.setAttribute('aria-labelledby', 'param-section-filters');

        const title = document.createElement('h3');
        title.className = 'parametrization__section-title';
        title.id = 'param-section-filters';
        title.textContent = 'Filtros de Contenido';
        section.appendChild(title);

        // Continent selector
        const continentGroup = this._createFieldGroup('param-continent', 'Continente');
        this.continentSelect = document.createElement('select');
        this.continentSelect.id = 'param-continent';
        this.continentSelect.className = 'parametrization__control';
        const continents = this.countryService.getAvailableContinents();
        for (const c of continents) {
            const option = document.createElement('option');
            option.value = c;
            option.textContent = c === 'All' ? '🌍 Todos' : c;
            if (c === this.continent) option.selected = true;
            this.continentSelect.appendChild(option);
        }
        this.continentSelect.addEventListener('change', () => this._onFilterChange());
        continentGroup.appendChild(this.continentSelect);
        section.appendChild(continentGroup);

        // Sovereignty filter
        const sovereigntyGroup = this._createFieldGroup('param-sovereignty', 'Soberanía');
        this.sovereigntySelect = document.createElement('select');
        this.sovereigntySelect.id = 'param-sovereignty';
        this.sovereigntySelect.className = 'parametrization__control';
        const sovereigntyOptions = [
            { value: 'All', label: '🌐 Todos' },
            { value: 'Yes', label: '🏳️ Solo soberanos' },
            { value: 'No', label: '🏢 Solo territorios' },
        ];
        for (const opt of sovereigntyOptions) {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            if (opt.value === this.sovereigntyStatus) option.selected = true;
            this.sovereigntySelect.appendChild(option);
        }
        this.sovereigntySelect.addEventListener('change', () => this._onFilterChange());
        sovereigntyGroup.appendChild(this.sovereigntySelect);
        section.appendChild(sovereigntyGroup);

        // Country count input
        const countGroup = this._createFieldGroup('param-country-count', 'Cantidad de países');
        this.countryCountInput = document.createElement('input');
        this.countryCountInput.id = 'param-country-count';
        this.countryCountInput.className = 'parametrization__control';
        this.countryCountInput.type = 'number';
        this.countryCountInput.min = String(MIN_POOL_SIZE);
        this.countryCountInput.max = String(this.maxCountryCount);
        this.countryCountInput.placeholder = `Máx: ${this.maxCountryCount}`;
        if (this.countryCount) {
            this.countryCountInput.value = String(this.countryCount);
        }
        this.countryCountInput.addEventListener('input', () => this._onCountryCountChange());
        countGroup.appendChild(this.countryCountInput);
        section.appendChild(countGroup);

        // Pool warning message
        this.poolWarning = document.createElement('p');
        this.poolWarning.className = 'parametrization__warning';
        this.poolWarning.setAttribute('role', 'alert');
        this.poolWarning.textContent = `Se necesitan al menos ${MIN_POOL_SIZE} países para jugar.`;
        this.poolWarning.hidden = true;
        section.appendChild(this.poolWarning);

        return section;
    }

    /**
     * Creates Section 2: Mode Options.
     * Dynamically renders options based on the selected mode.
     * @returns {HTMLElement}
     * @private
     */
    _createSection2() {
        const section = document.createElement('section');
        section.className = 'parametrization__section';
        section.setAttribute('aria-labelledby', 'param-section-options');

        const title = document.createElement('h3');
        title.className = 'parametrization__section-title';
        title.id = 'param-section-options';
        title.textContent = 'Opciones del Modo';
        section.appendChild(title);

        const optionDefs = MODE_OPTIONS[this.modeId] || [];

        if (optionDefs.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'parametrization__empty';
            empty.textContent = 'Este modo no tiene opciones adicionales.';
            section.appendChild(empty);
            return section;
        }

        for (const opt of optionDefs) {
            const group = this._createFieldGroup(`param-opt-${opt.id}`, opt.label);

            if (opt.type === 'select') {
                const select = document.createElement('select');
                select.id = `param-opt-${opt.id}`;
                select.className = 'parametrization__control';
                for (const o of opt.options) {
                    const option = document.createElement('option');
                    option.value = o.value;
                    option.textContent = o.label;
                    if (o.value === this.modeOptions[opt.id]) option.selected = true;
                    select.appendChild(option);
                }
                select.addEventListener('change', () => {
                    this.modeOptions[opt.id] = select.value;
                });
                group.appendChild(select);
            } else if (opt.type === 'number') {
                const input = document.createElement('input');
                input.id = `param-opt-${opt.id}`;
                input.className = 'parametrization__control';
                input.type = 'number';
                if (opt.min != null) input.min = String(opt.min);
                if (opt.max != null) input.max = String(opt.max);
                input.value = String(this.modeOptions[opt.id]);
                input.addEventListener('input', () => {
                    const val = parseInt(input.value, 10);
                    if (!isNaN(val)) {
                        this.modeOptions[opt.id] = val;
                    }
                });
                group.appendChild(input);
            }

            section.appendChild(group);
        }

        return section;
    }

    /**
     * Creates Section 3: Modifiers (team modes only).
     * Includes practice mode toggle and random order toggle.
     * @returns {HTMLElement}
     * @private
     */
    _createSection3() {
        const section = document.createElement('section');
        section.className = 'parametrization__section';
        section.setAttribute('aria-labelledby', 'param-section-modifiers');

        const title = document.createElement('h3');
        title.className = 'parametrization__section-title';
        title.id = 'param-section-modifiers';
        title.textContent = 'Modificadores';
        section.appendChild(title);

        // Practice mode toggle
        const practiceLabel = document.createElement('label');
        practiceLabel.className = 'parametrization__toggle';
        const practiceInput = document.createElement('input');
        practiceInput.type = 'checkbox';
        practiceInput.checked = this.practiceMode;
        practiceInput.addEventListener('change', () => {
            this.practiceMode = practiceInput.checked;
        });
        const practiceText = document.createElement('span');
        practiceText.textContent = 'Modo práctica';
        practiceLabel.appendChild(practiceInput);
        practiceLabel.appendChild(practiceText);
        section.appendChild(practiceLabel);

        // Random order toggle
        const randomLabel = document.createElement('label');
        randomLabel.className = 'parametrization__toggle';
        const randomInput = document.createElement('input');
        randomInput.type = 'checkbox';
        randomInput.checked = this.randomOrder;
        randomInput.addEventListener('change', () => {
            this.randomOrder = randomInput.checked;
        });
        const randomText = document.createElement('span');
        randomText.textContent = 'Orden aleatorio';
        randomLabel.appendChild(randomInput);
        randomLabel.appendChild(randomText);
        section.appendChild(randomLabel);

        return section;
    }

    /**
     * Creates the footer with back and play buttons.
     * @returns {HTMLElement}
     * @private
     */
    _createFooter() {
        const footer = document.createElement('footer');
        footer.className = 'parametrization__footer';

        const backBtn = document.createElement('button');
        backBtn.className = 'parametrization__back-btn';
        backBtn.type = 'button';
        backBtn.textContent = '← Volver';
        backBtn.addEventListener('click', () => {
            if (this.onBack) this.onBack();
        });

        this.playButton = document.createElement('button');
        this.playButton.className = 'parametrization__play-btn';
        this.playButton.type = 'button';
        this.playButton.textContent = '¡Jugar!';
        this.playButton.addEventListener('click', () => {
            if (this.onPlay && !this.playButton.disabled) {
                this.onPlay(this._buildConfig());
            }
        });

        footer.appendChild(backBtn);
        footer.appendChild(this.playButton);

        return footer;
    }

    /**
     * Creates a labeled field group wrapper.
     * @param {string} forId - The id of the associated control
     * @param {string} labelText - The label text
     * @returns {HTMLElement}
     * @private
     */
    _createFieldGroup(forId, labelText) {
        const group = document.createElement('div');
        group.className = 'parametrization__field';

        const label = document.createElement('label');
        label.className = 'parametrization__label';
        label.setAttribute('for', forId);
        label.textContent = labelText;
        group.appendChild(label);

        return group;
    }

    /**
     * Handles changes to continent or sovereignty filters.
     * Updates max country count and play button state.
     * @private
     */
    _onFilterChange() {
        this.continent = this.continentSelect.value;
        this.sovereigntyStatus = this.sovereigntySelect.value;
        this._updateMaxCountryCount();

        // Update country count input max and placeholder
        this.countryCountInput.max = String(this.maxCountryCount);
        this.countryCountInput.placeholder = `Máx: ${this.maxCountryCount}`;

        // Clamp current value if it exceeds new max
        if (this.countryCount && this.countryCount > this.maxCountryCount) {
            this.countryCount = this.maxCountryCount;
            this.countryCountInput.value = String(this.maxCountryCount);
        }

        this._updatePlayButtonState();
    }

    /**
     * Handles changes to the country count input.
     * @private
     */
    _onCountryCountChange() {
        const val = parseInt(this.countryCountInput.value, 10);
        if (!isNaN(val) && val > 0) {
            this.countryCount = Math.min(val, this.maxCountryCount);
        } else {
            this.countryCount = null;
        }
        this._updatePlayButtonState();
    }

    /**
     * Updates the maximum country count based on current filters.
     * @private
     */
    _updateMaxCountryCount() {
        this.maxCountryCount = this.countryService.getMaxCountryCount({
            continent: this.continent,
            sovereigntyStatus: this.sovereigntyStatus,
        });
    }

    /**
     * Updates the play button disabled state based on pool size.
     * Disables when the filtered pool is too small for the mode.
     * @private
     */
    _updatePlayButtonState() {
        if (!this.playButton) return;

        const poolSize = this._getEffectivePoolSize();
        const tooSmall = poolSize < MIN_POOL_SIZE;

        this.playButton.disabled = tooSmall;
        this.playButton.setAttribute('aria-disabled', String(tooSmall));

        if (this.poolWarning) {
            this.poolWarning.hidden = !tooSmall;
        }
    }

    /**
     * Gets the effective pool size considering current filters and country count.
     * @returns {number}
     * @private
     */
    _getEffectivePoolSize() {
        if (this.countryCount && this.countryCount >= MIN_POOL_SIZE) {
            return Math.min(this.countryCount, this.maxCountryCount);
        }
        return this.maxCountryCount;
    }

    /**
     * Builds the configuration object to pass to onPlay.
     * @returns {Object}
     * @private
     */
    _buildConfig() {
        const config = {
            modeId: this.modeId,
            continent: this.continent,
            sovereigntyStatus: this.sovereigntyStatus,
            maxCount: this.countryCount || this.maxCountryCount,
            modeOptions: { ...this.modeOptions },
        };

        if (this.mode.category === 'team') {
            config.practiceMode = this.practiceMode;
            config.randomOrder = this.randomOrder;
        }

        return config;
    }

    /**
     * Cleans up event listeners and DOM content.
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.continentSelect = null;
        this.sovereigntySelect = null;
        this.countryCountInput = null;
        this.playButton = null;
        this.poolWarning = null;
    }
}
