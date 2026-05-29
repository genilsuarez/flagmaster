import { GAME_MODES } from '../models/ModeDefinition.js';
import { getOptionsForMode } from '../models/ModeOptions.js';

/** Minimum pool size required to start a game */
const MIN_POOL_SIZE = 5;
/**
 * Modal bottom sheet for quick game configuration.
 * Implements focus trap, escape-to-close, swipe-to-dismiss.
 * Remembers last configuration per mode via localStorage.
 */
export class BottomSheetView {
    static STORAGE_KEY = 'flagquiz_mode_config_';

    /**
     * @param {Object} options
     * @param {import('../services/CountryService.js').CountryService} options.countryService
     * @param {import('../services/GlobalDefaultsService.js').GlobalDefaultsService} [options.globalDefaults]
     * @param {function(Object): void} options.onPlay - Callback with config object
     * @param {function(): void} options.onDismiss - Callback when sheet is dismissed
     */
    constructor({ countryService, globalDefaults = null, onPlay, onDismiss }) {
        this.countryService = countryService;
        this.globalDefaults = globalDefaults;
        this.onPlay = onPlay;
        this.onDismiss = onDismiss;

        // State
        this.modeId = null;
        this.mode = null;
        this.isOpen = false;

        // Filter state
        this.continent = 'All';
        this.sovereigntyStatus = 'All';
        this.countryCount = null;
        this.maxCountryCount = 0;

        // Tracks whether the user explicitly changed each filter in this session.
        // Only fields marked dirty are persisted as local overrides; unmarked fields
        // continue to inherit from the global defaults on every open.
        this._dirtyContinent = false;
        this._dirtySovereignty = false;
        this._dirtyCountryCount = false;

        // Mode options state
        this.modeOptions = {};

        // Modifier state (team modes only)
        this.practiceMode = false;
        this.randomOrder = true;

        // DOM references
        this.backdrop = null;
        this.sheet = null;
        this.playButton = null;
        this.poolWarning = null;
        this.continentSelect = null;
        this.sovereigntySelect = null;
        this.countryCountInput = null;

        // Focus management
        this._triggerElement = null;
        this._focusTrapHandler = null;
        this._escapeHandler = null;

        // Swipe state
        this._touchStartY = 0;
        this._touchCurrentY = 0;
        this._isSwiping = false;
    }

    /**
     * Opens the bottom sheet for the given mode.
     * Animates in, renders config, traps focus.
     * @param {string} modeId
     */
    open(modeId) {
        if (this.isOpen) this.close();

        this.modeId = modeId;
        this.mode = GAME_MODES[modeId] || null;
        if (!this.mode) return;

        this._triggerElement = document.activeElement;

        // Initialize mode options with defaults
        this.modeOptions = {};
        const optionDefs = getOptionsForMode(modeId);
        for (const opt of optionDefs) {
            this.modeOptions[opt.id] = opt.default;
        }

        // Reset filters to factory defaults
        this.continent = 'All';
        this.sovereigntyStatus = 'All';
        this.countryCount = null;
        this.practiceMode = false;
        this.randomOrder = true;

        // Reset dirty flags — no local overrides until the user explicitly changes a filter
        this._dirtyContinent = false;
        this._dirtySovereignty = false;
        this._dirtyCountryCount = false;

        // Apply global defaults (overrides factory defaults — level 2 of 3)
        if (this.globalDefaults) {
            const gd = this.globalDefaults.get();
            this.continent        = gd.continent;
            this.sovereigntyStatus = gd.sovereigntyStatus;
            this.countryCount     = gd.maxCount;
            this.randomOrder      = gd.randomOrder;
        }

        // Apply local per-mode overrides (overrides global defaults — level 3 of 3)
        this._loadSavedConfig(modeId);

        // Update max country count
        this._updateMaxCountryCount();

        // Create DOM
        this._createBackdrop();
        this._createSheet();

        // Render config controls
        this._renderConfig(modeId);

        // Append to body
        document.body.appendChild(this.backdrop);
        document.body.appendChild(this.sheet);

        // Animate in
        requestAnimationFrame(() => {
            if (this.backdrop) this.backdrop.classList.add('bottom-sheet__backdrop--visible');
            if (this.sheet) this.sheet.classList.add('bottom-sheet--visible');
        });

        this.isOpen = true;

        // Setup interactions
        this._initFocusTrap();
        this._initSwipeDismiss();
        this._updatePlayButtonState();

        // Move focus to play button after animation so Enter starts the game immediately
        setTimeout(() => {
            if (!this.sheet) return;
            if (this.playButton && !this.playButton.disabled) {
                this.playButton.focus();
            } else {
                const firstFocusable = this.sheet.querySelector(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (firstFocusable) firstFocusable.focus();
            }
        }, 300);
    }

    /**
     * Closes the bottom sheet with slide-down animation.
     * Restores focus to triggering element.
     */
    close() {
        if (!this.isOpen) return;

        // Save config before closing
        if (this.modeId) {
            this._saveConfig(this.modeId, this._buildConfig());
        }

        // Animate out
        if (this.backdrop) this.backdrop.classList.remove('bottom-sheet__backdrop--visible');
        if (this.sheet) this.sheet.classList.remove('bottom-sheet--visible');

        // Remove after animation
        setTimeout(() => {
            this._cleanup();
        }, 300);

        this.isOpen = false;

        // Restore focus
        if (this._triggerElement && this._triggerElement.focus) {
            this._triggerElement.focus();
        }

        if (this.onDismiss) this.onDismiss();
    }

    /**
     * Creates the backdrop overlay element.
     * @private
     */
    _createBackdrop() {
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'bottom-sheet__backdrop';
        this.backdrop.setAttribute('aria-hidden', 'true');
        this.backdrop.addEventListener('click', () => this.close());
    }

    /**
     * Creates the sheet panel element.
     * @private
     */
    _createSheet() {
        this.sheet = document.createElement('div');
        this.sheet.className = 'bottom-sheet';
        this.sheet.setAttribute('role', 'dialog');
        this.sheet.setAttribute('aria-modal', 'true');
        this.sheet.setAttribute('aria-label', `Configuración: ${this.mode.name}`);
    }

    /**
     * Renders configuration controls inside the sheet.
     * @param {string} modeId
     * @private
     */
    _renderConfig(modeId) {
        this.sheet.innerHTML = '';

        // Drag handle
        const handle = document.createElement('div');
        handle.className = 'bottom-sheet__handle';
        handle.innerHTML = '<span class="bottom-sheet__handle-bar"></span>';
        this.sheet.appendChild(handle);

        // Header
        const header = document.createElement('header');
        header.className = 'bottom-sheet__header';

        const icon = document.createElement('span');
        icon.className = 'bottom-sheet__mode-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = this.mode.icon;

        const title = document.createElement('h2');
        title.className = 'bottom-sheet__title';
        title.textContent = this.mode.name;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'bottom-sheet__close-btn';
        closeBtn.type = 'button';
        closeBtn.setAttribute('aria-label', 'Cerrar configuración');
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', () => this.close());

        header.appendChild(icon);
        header.appendChild(title);
        header.appendChild(closeBtn);
        this.sheet.appendChild(header);

        // Content area
        const content = document.createElement('div');
        content.className = 'bottom-sheet__content';

        // Section 1: Content Filters
        content.appendChild(this._createFiltersSection());

        // Section 2: Mode Options
        const optionDefs = getOptionsForMode(modeId);
        if (optionDefs.length > 0) {
            content.appendChild(this._createModeOptionsSection(optionDefs));
        }

        // Section 3: Modifiers (team modes only)
        if (this.mode.category === 'team') {
            content.appendChild(this._createModifiersSection());
        }

        this.sheet.appendChild(content);

        // Footer with play button
        this.sheet.appendChild(this._createFooter());
    }

    /**
     * Creates the content filters section (continent, sovereignty, count).
     * @returns {HTMLElement}
     * @private
     */
    _createFiltersSection() {
        const section = document.createElement('section');
        section.className = 'bottom-sheet__section';

        const title = document.createElement('h3');
        title.className = 'bottom-sheet__section-title';
        title.textContent = 'Filtros de Contenido';
        section.appendChild(title);

        // Continent selector
        const continentGroup = this._createFieldGroup('bs-continent', 'Continente');
        this.continentSelect = document.createElement('select');
        this.continentSelect.id = 'bs-continent';
        this.continentSelect.className = 'bottom-sheet__control';
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
        const sovereigntyGroup = this._createFieldGroup('bs-sovereignty', 'Soberanía');
        this.sovereigntySelect = document.createElement('select');
        this.sovereigntySelect.id = 'bs-sovereignty';
        this.sovereigntySelect.className = 'bottom-sheet__control';
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
        const countGroup = this._createFieldGroup('bs-country-count', 'Cantidad de países');
        this.countryCountInput = document.createElement('input');
        this.countryCountInput.id = 'bs-country-count';
        this.countryCountInput.className = 'bottom-sheet__control';
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
        this.poolWarning.className = 'bottom-sheet__warning';
        this.poolWarning.setAttribute('role', 'alert');
        this.poolWarning.textContent = `Se necesitan al menos ${MIN_POOL_SIZE} países para jugar.`;
        this.poolWarning.hidden = true;
        section.appendChild(this.poolWarning);

        return section;
    }

    /**
     * Creates the mode-specific options section.
     * @param {Array} optionDefs
     * @returns {HTMLElement}
     * @private
     */
    _createModeOptionsSection(optionDefs) {
        const section = document.createElement('section');
        section.className = 'bottom-sheet__section';

        const title = document.createElement('h3');
        title.className = 'bottom-sheet__section-title';
        title.textContent = 'Opciones del Modo';
        section.appendChild(title);

        for (const opt of optionDefs) {
            const group = this._createFieldGroup(`bs-opt-${opt.id}`, opt.label);

            if (opt.type === 'select') {
                const select = document.createElement('select');
                select.id = `bs-opt-${opt.id}`;
                select.className = 'bottom-sheet__control';
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
                input.id = `bs-opt-${opt.id}`;
                input.className = 'bottom-sheet__control';
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
     * Creates the modifiers section (team modes only).
     * @returns {HTMLElement}
     * @private
     */
    _createModifiersSection() {
        const section = document.createElement('section');
        section.className = 'bottom-sheet__section';

        const title = document.createElement('h3');
        title.className = 'bottom-sheet__section-title';
        title.textContent = 'Modificadores';
        section.appendChild(title);

        // Practice mode toggle
        const practiceLabel = document.createElement('label');
        practiceLabel.className = 'bottom-sheet__toggle';
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
        randomLabel.className = 'bottom-sheet__toggle';
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
     * Creates the footer with the play button and local reset button.
     * @returns {HTMLElement}
     * @private
     */
    _createFooter() {
        const footer = document.createElement('footer');
        footer.className = 'bottom-sheet__footer';

        // Reset local config button — only shown when local overrides exist
        const resetBtn = document.createElement('button');
        resetBtn.className = 'bottom-sheet__reset-btn';
        resetBtn.type = 'button';
        resetBtn.textContent = '↺ Restablecer';
        resetBtn.title = 'Borrar configuración local y volver a los valores globales';
        resetBtn.addEventListener('click', () => this._resetLocalConfig());

        // Show only when local config exists for this mode
        const hasLocal = !!localStorage.getItem(BottomSheetView.STORAGE_KEY + this.modeId);
        resetBtn.hidden = !hasLocal;

        this.playButton = document.createElement('button');
        this.playButton.className = 'bottom-sheet__play-btn';
        this.playButton.type = 'button';
        this.playButton.textContent = 'Jugar';
        this.playButton.addEventListener('click', () => {
            if (!this.playButton.disabled && this.onPlay) {
                this._saveConfig(this.modeId, this._buildConfig());
                const config = this._buildConfig();
                try {
                    this.onPlay(config);
                } finally {
                    this._cleanupWithoutDismiss();
                }
            }
        });

        footer.appendChild(resetBtn);
        footer.appendChild(this.playButton);
        return footer;
    }

    /**
     * Clears the local per-mode config from localStorage and re-applies
     * the global defaults (level 2) so the UI reflects the reset state.
     * @private
     */
    _resetLocalConfig() {
        // Remove local storage entry
        localStorage.removeItem(BottomSheetView.STORAGE_KEY + this.modeId);

        // Re-apply factory defaults then global defaults (levels 1 + 2)
        this.continent         = 'All';
        this.sovereigntyStatus = 'All';
        this.countryCount      = null;
        this.practiceMode      = false;
        this.randomOrder       = true;

        // Clear dirty flags — after reset, all filters inherit from global defaults
        this._dirtyContinent    = false;
        this._dirtySovereignty  = false;
        this._dirtyCountryCount = false;

        if (this.globalDefaults) {
            const gd = this.globalDefaults.get();
            this.continent         = gd.continent;
            this.sovereigntyStatus = gd.sovereigntyStatus;
            this.countryCount      = gd.maxCount;
            this.randomOrder       = gd.randomOrder;
        }

        // Re-apply mode option defaults
        const optionDefs = getOptionsForMode(this.modeId);
        this.modeOptions = {};
        for (const opt of optionDefs) {
            this.modeOptions[opt.id] = opt.default;
        }

        // Re-render the full sheet — _renderConfig rebuilds everything from
        // current state, and _createFooter will hide the reset button since
        // local storage was just cleared.
        this._updateMaxCountryCount();
        this._renderConfig(this.modeId);
        this._updatePlayButtonState();
    }

    /**
     * Creates a labeled field group wrapper.
     * @param {string} forId
     * @param {string} labelText
     * @returns {HTMLElement}
     * @private
     */
    _createFieldGroup(forId, labelText) {
        const group = document.createElement('div');
        group.className = 'bottom-sheet__field';

        const label = document.createElement('label');
        label.className = 'bottom-sheet__label';
        label.setAttribute('for', forId);
        label.textContent = labelText;
        group.appendChild(label);

        return group;
    }

    /**
     * Loads saved per-mode configuration from localStorage.
     *
     * Applies a 3-level hierarchy:
     *   1. Factory defaults (hardcoded)
     *   2. Global defaults (flagquiz_global_defaults) — already applied before this call
     *   3. Local per-mode overrides (flagquiz_mode_config_<modeId>) — applied here
     *
     * Local overrides win over global defaults for ALL fields, including
     * continent, sovereigntyStatus, countryCount, randomOrder, modeOptions,
     * and practiceMode. A field is only restored if it was explicitly saved
     * (i.e. the user changed it at the mode level).
     *
     * @param {string} modeId
     * @private
     */
    _loadSavedConfig(modeId) {
        try {
            const key = BottomSheetView.STORAGE_KEY + modeId;
            const saved = localStorage.getItem(key);
            if (!saved) return;

            const config = JSON.parse(saved);

            // Restore content filters — only apply if the user explicitly set them
            // (indicated by the _dirty* flags persisted alongside the value).
            // This ensures that changing the global default later is still reflected
            // in modes where the user never touched that particular filter locally.
            if (config._dirtyContinent && config.continent !== undefined) {
                this.continent = config.continent;
                this._dirtyContinent = true;
            }
            if (config._dirtySovereignty && config.sovereigntyStatus !== undefined) {
                this.sovereigntyStatus = config.sovereigntyStatus;
                this._dirtySovereignty = true;
            }
            if (config._dirtyCountryCount && config.countryCount !== undefined) {
                this.countryCount = config.countryCount;
                this._dirtyCountryCount = true;
            }

            // Restore mode-specific options
            if (config.modeOptions) {
                Object.assign(this.modeOptions, config.modeOptions);
            }

            // Restore modifiers
            if (config.practiceMode !== undefined) this.practiceMode = config.practiceMode;
            if (config.randomOrder !== undefined)  this.randomOrder  = config.randomOrder;
        } catch {
            // Ignore invalid localStorage data
        }
    }

    /**
     * Saves per-mode configuration to localStorage.
     *
     * Persists ALL user-configurable fields so that local preferences fully
     * override global defaults on the next open (3-level hierarchy).
     *
     * @param {string} modeId
     * @param {Object} config - Full config from _buildConfig()
     * @private
     */
    _saveConfig(modeId, config) {
        try {
            const key = BottomSheetView.STORAGE_KEY + modeId;
            const perMode = {
                // Content filters — only saved when the user explicitly changed them
                // in this mode's sheet (dirty flags). Non-dirty fields are left out so
                // that the global default continues to apply on the next open.
                _dirtyContinent:    this._dirtyContinent,
                _dirtySovereignty:  this._dirtySovereignty,
                _dirtyCountryCount: this._dirtyCountryCount,
                continent:         this.continent,
                sovereigntyStatus: this.sovereigntyStatus,
                countryCount:      this.countryCount,
                // Mode-specific options
                modeOptions:       config.modeOptions || {},
            };
            if (config.practiceMode !== undefined) perMode.practiceMode = config.practiceMode;
            if (config.randomOrder !== undefined)  perMode.randomOrder  = config.randomOrder;
            localStorage.setItem(key, JSON.stringify(perMode));
        } catch {
            // Ignore storage errors (quota exceeded, etc.)
        }
    }

    /**
     * Builds the configuration object compatible with startGame().
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

        if (this.mode && this.mode.category === 'team') {
            config.practiceMode = this.practiceMode;
            config.randomOrder = this.randomOrder;
        }

        return config;
    }

    /**
     * Initializes focus trap within the sheet.
     * Tab cycles within, Shift+Tab wraps, Escape closes.
     * @private
     */
    _initFocusTrap() {
        this._escapeHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.close();
            }
        };

        this._focusTrapHandler = (e) => {
            if (e.key !== 'Tab') return;

            const focusableElements = this.sheet.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusableElements.length === 0) return;

            const firstFocusable = focusableElements[0];
            const lastFocusable = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                // Shift+Tab: wrap to last element
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                }
            } else {
                // Tab: wrap to first element
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        };

        document.addEventListener('keydown', this._escapeHandler);
        this.sheet.addEventListener('keydown', this._focusTrapHandler);
    }

    /**
     * Initializes swipe-to-dismiss gesture for touch devices.
     * @private
     */
    _initSwipeDismiss() {
        if (!this.sheet) return;

        const onTouchStart = (e) => {
            this._touchStartY = e.touches[0].clientY;
            this._touchCurrentY = this._touchStartY;
            this._isSwiping = false;
        };

        const onTouchMove = (e) => {
            this._touchCurrentY = e.touches[0].clientY;
            const deltaY = this._touchCurrentY - this._touchStartY;

            // Only allow downward swipe
            if (deltaY > 10) {
                this._isSwiping = true;
                // Apply transform for visual feedback
                const translateY = Math.min(deltaY, 300);
                this.sheet.style.transform = `translate(-50%, -50%) translateY(${translateY}px)`;
                this.sheet.style.transition = 'none';
            }
        };

        const onTouchEnd = () => {
            const deltaY = this._touchCurrentY - this._touchStartY;

            if (this._isSwiping && deltaY > 100) {
                // Dismiss threshold reached
                this.close();
            } else {
                // Snap back
                this.sheet.style.transform = '';
                this.sheet.style.transition = '';
            }

            this._isSwiping = false;
        };

        this.sheet.addEventListener('touchstart', onTouchStart, { passive: true });
        this.sheet.addEventListener('touchmove', onTouchMove, { passive: true });
        this.sheet.addEventListener('touchend', onTouchEnd, { passive: true });

        // Store references for cleanup
        this._touchHandlers = { onTouchStart, onTouchMove, onTouchEnd };
    }

    /**
     * Updates the play button disabled state based on pool size.
     * Disables when the filtered pool is too small.
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
     * Gets the effective pool size considering current filters.
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
     * Handles changes to continent or sovereignty filters.
     * @private
     */
    _onFilterChange() {
        const prevContinent = this.continent;
        const prevSovereignty = this.sovereigntyStatus;

        this.continent = this.continentSelect.value;
        this.sovereigntyStatus = this.sovereigntySelect.value;

        // Mark as locally modified if the user changed the value
        if (this.continent !== prevContinent) this._dirtyContinent = true;
        if (this.sovereigntyStatus !== prevSovereignty) this._dirtySovereignty = true;

        const prevMax = this.maxCountryCount;
        this._updateMaxCountryCount();

        // Update country count input max and placeholder
        if (this.countryCountInput) {
            this.countryCountInput.max = String(this.maxCountryCount);
            this.countryCountInput.placeholder = `Máx: ${this.maxCountryCount}`;

            if (this.countryCount && this.countryCount >= prevMax) {
                // Was at (or above) the previous max — treat as "use maximum",
                // so reset to null and clear the input to reflect the new max.
                this.countryCount = null;
                this.countryCountInput.value = '';
            } else if (this.countryCount && this.countryCount > this.maxCountryCount) {
                // Clamp to new max if the custom value exceeds it
                this.countryCount = this.maxCountryCount;
                this.countryCountInput.value = String(this.maxCountryCount);
            }
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
            this._dirtyCountryCount = true;
        } else {
            this.countryCount = null;
            // Only clear the dirty flag if the field is explicitly emptied
            if (this.countryCountInput.value.trim() === '') {
                this._dirtyCountryCount = false;
            }
        }
        this._updatePlayButtonState();
    }

    /**
     * Cleans up DOM elements and event listeners.
     * @private
     */
    _cleanup() {
        if (this._escapeHandler) {
            document.removeEventListener('keydown', this._escapeHandler);
            this._escapeHandler = null;
        }
        if (this._focusTrapHandler && this.sheet) {
            this.sheet.removeEventListener('keydown', this._focusTrapHandler);
            this._focusTrapHandler = null;
        }
        if (this._touchHandlers && this.sheet) {
            this.sheet.removeEventListener('touchstart', this._touchHandlers.onTouchStart);
            this.sheet.removeEventListener('touchmove', this._touchHandlers.onTouchMove);
            this.sheet.removeEventListener('touchend', this._touchHandlers.onTouchEnd);
            this._touchHandlers = null;
        }
        if (this.backdrop && this.backdrop.parentNode) {
            this.backdrop.parentNode.removeChild(this.backdrop);
        }
        if (this.sheet && this.sheet.parentNode) {
            this.sheet.parentNode.removeChild(this.sheet);
        }

        this.backdrop = null;
        this.sheet = null;
        this.playButton = null;
        this.poolWarning = null;
        this.continentSelect = null;
        this.sovereigntySelect = null;
        this.countryCountInput = null;
    }

    /**
     * Cleans up without triggering onDismiss (used when playing).
     * @private
     */
    _cleanupWithoutDismiss() {
        this.isOpen = false;
        if (this._escapeHandler) {
            document.removeEventListener('keydown', this._escapeHandler);
            this._escapeHandler = null;
        }
        if (this._focusTrapHandler && this.sheet) {
            this.sheet.removeEventListener('keydown', this._focusTrapHandler);
            this._focusTrapHandler = null;
        }
        if (this._touchHandlers && this.sheet) {
            this.sheet.removeEventListener('touchstart', this._touchHandlers.onTouchStart);
            this.sheet.removeEventListener('touchmove', this._touchHandlers.onTouchMove);
            this.sheet.removeEventListener('touchend', this._touchHandlers.onTouchEnd);
            this._touchHandlers = null;
        }
        if (this.backdrop && this.backdrop.parentNode) {
            this.backdrop.parentNode.removeChild(this.backdrop);
        }
        if (this.sheet && this.sheet.parentNode) {
            this.sheet.parentNode.removeChild(this.sheet);
        }

        this.backdrop = null;
        this.sheet = null;
        this.playButton = null;
        this.poolWarning = null;
        this.continentSelect = null;
        this.sovereigntySelect = null;
        this.countryCountInput = null;
    }
}
