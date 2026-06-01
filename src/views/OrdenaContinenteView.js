/**
 * OrdenaContinenteView
 * 
 * View dedicada para renderizar la interfaz de clasificación del modo
 * "Ordena por Continente". Responsable de DOM, estilos y feedback visual.
 * 
 * Sigue el patrón de views existentes (WordDropView, GameView):
 * - Constructor crea estructura DOM
 * - render() inicializa la UI con datos de sesión
 * - Métodos de actualización para estado visual
 * - destroy() limpia DOM y listeners
 */
export class OrdenaContinenteView {
    constructor(container) {
        this.container = container;
        this.elements = {};
        this.items = [];
        this.zones = [];
        this.options = {};

        // Callbacks (inyectados por controller)
        this.onAssign = null;
        this.onUnassign = null;
        this.onReassign = null;
        this.onVerify = null;

        // Keyboard navigation state
        this._keyboardSelectedItemId = null;

        this._injectStyles();
    }

    /**
     * Renderiza la UI completa de clasificación.
     * @param {Array} items - GameItem[] con id, displayValue, displayType, flagUrl, capital
     * @param {Array} zones - Zone[] con id, continent, label
     * @param {Object} options - { timerEnabled, timeLimit }
     */
    render(items, zones, options = {}) {
        this.items = items;
        this.zones = zones;
        this.options = options;

        // Limpiar contenedor
        this.container.innerHTML = '';

        // Crear wrapper principal
        const wrapper = document.createElement('div');
        wrapper.className = 'oc-wrapper';

        // --- Header: contador + botón verificar ---
        const header = this._createHeader(items.length);
        wrapper.appendChild(header);

        // --- Timer bar (condicional) ---
        if (options.timerEnabled) {
            const timerBar = this._createTimerBar();
            wrapper.appendChild(timerBar);
        }

        // --- Panel de ítems ---
        const panel = this._createItemsPanel(items);
        wrapper.appendChild(panel);

        // --- Zonas de continente ---
        const zonesContainer = this._createZonesContainer(zones);
        wrapper.appendChild(zonesContainer);

        // --- Regiones aria-live ---
        const liveRegions = this._createLiveRegions();
        wrapper.appendChild(liveRegions);

        this.container.appendChild(wrapper);
        this.elements.wrapper = wrapper;

        // Setup keyboard navigation (event delegation on wrapper)
        this._setupKeyboardNavigation();
    }

    // ─── Header: contador + botón ───────────────────────────────────────

    _createHeader(totalItems) {
        const header = document.createElement('div');
        header.className = 'oc-header';

        // Contador
        const counter = document.createElement('span');
        counter.className = 'oc-counter';
        counter.setAttribute('aria-label', `Ítems pendientes: ${totalItems} de ${totalItems}`);
        counter.textContent = `${totalItems} / ${totalItems}`;
        this.elements.counter = counter;

        // Botón verificar
        const verifyBtn = document.createElement('button');
        verifyBtn.className = 'btn btn--primary oc-verify-btn';
        verifyBtn.textContent = 'Verificar respuestas';
        verifyBtn.disabled = true;
        verifyBtn.addEventListener('click', () => {
            if (this.onVerify) this.onVerify();
        });
        this.elements.verifyBtn = verifyBtn;

        header.appendChild(counter);
        header.appendChild(verifyBtn);

        return header;
    }

    // ─── Timer bar ──────────────────────────────────────────────────────

    _createTimerBar() {
        const timerContainer = document.createElement('div');
        timerContainer.className = 'oc-timer';
        timerContainer.setAttribute('role', 'progressbar');
        timerContainer.setAttribute('aria-label', 'Tiempo restante');
        timerContainer.setAttribute('aria-valuemin', '0');
        timerContainer.setAttribute('aria-valuemax', '100');
        timerContainer.setAttribute('aria-valuenow', '100');

        const timerFill = document.createElement('div');
        timerFill.className = 'oc-timer__fill';
        timerContainer.appendChild(timerFill);

        this.elements.timer = timerContainer;
        this.elements.timerFill = timerFill;

        return timerContainer;
    }

    // ─── Panel de ítems ─────────────────────────────────────────────────

    _createItemsPanel(items) {
        const panel = document.createElement('div');
        panel.className = 'oc-panel';
        panel.setAttribute('role', 'list');
        panel.setAttribute('aria-label', 'Ítems pendientes de clasificar');

        items.forEach(item => {
            const itemEl = this._createItemElement(item);
            panel.appendChild(itemEl);
        });

        this.elements.panel = panel;
        return panel;
    }

    _createItemElement(item) {
        const el = document.createElement('div');
        el.className = 'oc-item';
        el.setAttribute('role', 'listitem');
        el.setAttribute('data-item-id', item.id);
        el.setAttribute('tabindex', '0');
        el.setAttribute('draggable', 'true');

        if (item.displayType === 'flag') {
            const img = document.createElement('img');
            // Usar PNG rasterizado en vez de SVG para evitar rendering progresivo
            img.src = this._getFlagPngUrl(item.flagUrl);
            img.alt = item.displayValue || 'Bandera';
            img.className = 'oc-item__flag';
            img.decoding = 'async';
            img.width = 80;
            img.height = 53;
            // Fallback si la imagen no carga
            img.addEventListener('error', () => {
                // Si PNG falla, intentar con SVG original
                if (!img.dataset.fallbackAttempted) {
                    img.dataset.fallbackAttempted = 'true';
                    img.src = item.flagUrl;
                    return;
                }
                img.style.display = 'none';
                const fallback = document.createElement('span');
                fallback.className = 'oc-item__fallback';
                fallback.textContent = item.capital || item.displayValue;
                el.appendChild(fallback);
            });
            el.appendChild(img);
        } else {
            const label = document.createElement('span');
            label.className = 'oc-item__label';
            label.textContent = item.displayValue;
            el.appendChild(label);
        }

        return el;
    }

    /**
     * Convierte URL de SVG de flagcdn a PNG rasterizado (w80) para carga instantánea.
     * Ejemplo: https://flagcdn.com/dz.svg → https://flagcdn.com/w80/dz.png
     */
    _getFlagPngUrl(svgUrl) {
        if (!svgUrl || !svgUrl.includes('flagcdn.com')) return svgUrl;
        const code = svgUrl.split('/').pop().replace('.svg', '');
        return `https://flagcdn.com/w80/${code}.png`;
    }

    // ─── Zonas de continente ────────────────────────────────────────────

    _createZonesContainer(zones) {
        const container = document.createElement('div');
        container.className = 'oc-zones';

        zones.forEach(zone => {
            const zoneEl = this._createZoneElement(zone);
            container.appendChild(zoneEl);
        });

        this.elements.zonesContainer = container;
        return container;
    }

    _createZoneElement(zone) {
        const el = document.createElement('div');
        el.className = 'oc-zone';
        el.setAttribute('role', 'region');
        el.setAttribute('aria-label', `${zone.label} — 0 ítems asignados`);
        el.setAttribute('data-zone-id', zone.id);
        el.setAttribute('tabindex', '0');

        // Título de la zona
        const title = document.createElement('h3');
        title.className = 'oc-zone__title';
        title.textContent = zone.label;

        // Contenedor de ítems asignados
        const itemsArea = document.createElement('div');
        itemsArea.className = 'oc-zone__items';

        el.appendChild(title);
        el.appendChild(itemsArea);

        return el;
    }

    // ─── Regiones aria-live ─────────────────────────────────────────────

    _createLiveRegions() {
        const fragment = document.createDocumentFragment();

        // Polite: anuncios de asignación/desasignación
        const polite = document.createElement('div');
        polite.className = 'oc-sr-only';
        polite.setAttribute('aria-live', 'polite');
        polite.setAttribute('aria-atomic', 'true');
        polite.id = 'oc-live-polite';
        this.elements.livePolite = polite;

        // Assertive: resultados de evaluación
        const assertive = document.createElement('div');
        assertive.className = 'oc-sr-only';
        assertive.setAttribute('aria-live', 'assertive');
        assertive.setAttribute('aria-atomic', 'true');
        assertive.id = 'oc-live-assertive';
        this.elements.liveAssertive = assertive;

        fragment.appendChild(polite);
        fragment.appendChild(assertive);

        return fragment;
    }

    // ─── Métodos de actualización (stubs para task 5.2) ─────────────────

    /**
     * Actualiza el estado visual de un ítem.
     * @param {string} itemId
     * @param {Object} state - { selected, dragging, correct, incorrect }
     */
    updateItemState(itemId, state) {
        const el = this.container.querySelector(`[data-item-id="${itemId}"]`);
        if (!el) return;

        el.classList.toggle('oc-item--selected', !!state.selected);
        el.classList.toggle('oc-item--dragging', !!state.dragging);
        el.classList.toggle('oc-item--correct', !!state.correct);
        el.classList.toggle('oc-item--incorrect', !!state.incorrect);
    }

    /**
     * Anima un ítem del panel hacia una zona.
     * @param {string} itemId
     * @param {string} zoneId
     */
    moveItemToZone(itemId, zoneId) {
        const itemEl = this.container.querySelector(`[data-item-id="${itemId}"]`);
        const zoneEl = this.container.querySelector(`[data-zone-id="${zoneId}"]`);
        if (!itemEl || !zoneEl) return;

        const zoneItems = zoneEl.querySelector('.oc-zone__items');
        if (!zoneItems) return;

        // Mover el ítem al contenedor de la zona
        zoneItems.appendChild(itemEl);

        // Animación de transición
        itemEl.classList.add('oc-item--moving');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                itemEl.classList.remove('oc-item--moving');
            });
        });

        // Actualizar aria-label de la zona con el nuevo conteo
        const count = zoneItems.querySelectorAll('.oc-item').length;
        const zone = this.zones.find(z => z.id === zoneId);
        const label = zone ? zone.label : zoneId;
        zoneEl.setAttribute('aria-label', `${label} — ${count} ítem${count !== 1 ? 's' : ''} asignado${count !== 1 ? 's' : ''}`);

        // Anunciar asignación via aria-live polite
        const itemLabel = this._getItemLabel(itemEl);
        this.announcePolite(`${itemLabel} asignado a ${label}`);
    }

    /**
     * Devuelve un ítem al panel con animación.
     * @param {string} itemId
     */
    moveItemToPanel(itemId) {
        const itemEl = this.container.querySelector(`[data-item-id="${itemId}"]`);
        if (!itemEl || !this.elements.panel) return;

        // Identificar la zona de origen para actualizar su aria-label
        const sourceZone = itemEl.closest('.oc-zone');

        // Mover el ítem de vuelta al panel
        this.elements.panel.appendChild(itemEl);

        // Animación de transición
        itemEl.classList.add('oc-item--moving');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                itemEl.classList.remove('oc-item--moving');
            });
        });

        // Actualizar aria-label de la zona de origen
        if (sourceZone) {
            const zoneId = sourceZone.getAttribute('data-zone-id');
            const zoneItems = sourceZone.querySelector('.oc-zone__items');
            const count = zoneItems ? zoneItems.querySelectorAll('.oc-item').length : 0;
            const zone = this.zones.find(z => z.id === zoneId);
            const label = zone ? zone.label : zoneId;
            sourceZone.setAttribute('aria-label', `${label} — ${count} ítem${count !== 1 ? 's' : ''} asignado${count !== 1 ? 's' : ''}`);
        }

        // Anunciar retorno via aria-live polite
        const itemLabel = this._getItemLabel(itemEl);
        this.announcePolite(`${itemLabel} devuelto al panel`);
    }

    /**
     * Actualiza el texto del contador.
     */
    updateCounter(pending, total) {
        if (!this.elements.counter) return;
        this.elements.counter.textContent = `${pending} / ${total}`;
        this.elements.counter.setAttribute('aria-label', `Ítems pendientes: ${pending} de ${total}`);
    }

    /**
     * Habilita o deshabilita el botón "Verificar respuestas".
     */
    setVerifyEnabled(enabled) {
        if (!this.elements.verifyBtn) return;
        this.elements.verifyBtn.disabled = !enabled;
    }

    /**
     * Muestra retroalimentación visual de resultados.
     * @param {Array} results - [{ itemId, assignedZone, correctZone, isCorrect }]
     */
    showResults(results) {
        if (!results || !results.length) return;

        let correctCount = 0;
        let incorrectCount = 0;

        results.forEach(result => {
            const itemEl = this.container.querySelector(`[data-item-id="${result.itemId}"]`);
            if (!itemEl) return;

            if (result.isCorrect) {
                itemEl.classList.add('oc-item--correct');
                correctCount++;
            } else {
                itemEl.classList.add('oc-item--incorrect');
                incorrectCount++;

                // Mostrar el continente correcto para ítems incorrectos
                const correctLabel = this._getContinentLabel(result.correctZone);
                const badge = document.createElement('span');
                badge.className = 'oc-item__correct-zone';
                badge.textContent = correctLabel;
                badge.setAttribute('aria-label', `Continente correcto: ${correctLabel}`);
                itemEl.appendChild(badge);
            }
        });

        // Anunciar resultado global via aria-live assertive
        this.announceAssertive(
            `Resultado: ${correctCount} correcto${correctCount !== 1 ? 's' : ''}, ${incorrectCount} incorrecto${incorrectCount !== 1 ? 's' : ''}`
        );
    }

    /**
     * Muestra resumen final.
     * @param {Object} summary - { correct, incorrect, score, timeFormatted }
     */
    showSummary(summary) {
        if (!this.elements.wrapper) return;

        const overlay = document.createElement('div');
        overlay.className = 'oc-summary';

        const title = document.createElement('h2');
        title.className = 'oc-summary__title';
        title.textContent = 'Resultado Final';

        const stats = document.createElement('div');
        stats.className = 'oc-summary__stats';

        const correctLine = document.createElement('p');
        correctLine.className = 'oc-summary__stat oc-summary__stat--correct';
        correctLine.textContent = `✓ ${summary.correct} correctos`;

        const incorrectLine = document.createElement('p');
        incorrectLine.className = 'oc-summary__stat oc-summary__stat--incorrect';
        incorrectLine.textContent = `✗ ${summary.incorrect} incorrectos`;

        const scoreLine = document.createElement('p');
        scoreLine.className = 'oc-summary__score';
        scoreLine.textContent = `${summary.score} pts`;

        const timeLine = document.createElement('p');
        timeLine.className = 'oc-summary__time';
        timeLine.textContent = `Tiempo: ${summary.timeFormatted}`;

        stats.appendChild(correctLine);
        stats.appendChild(incorrectLine);
        stats.appendChild(scoreLine);
        stats.appendChild(timeLine);

        overlay.appendChild(title);
        overlay.appendChild(stats);

        this.elements.wrapper.appendChild(overlay);
        this.elements.summary = overlay;
    }

    /**
     * Muestra un botón "Continuar" para que el usuario revise el feedback inline
     * antes de pasar al modal de fin de juego.
     * @param {function} onContinue - Callback al presionar el botón
     */
    showContinueButton(onContinue) {
        if (!this.elements.wrapper) return;

        const btnContainer = document.createElement('div');
        btnContainer.className = 'oc-continue-container';

        const btn = document.createElement('button');
        btn.className = 'oc-continue-btn';
        btn.textContent = 'Continuar';
        btn.setAttribute('aria-label', 'Continuar al resumen final');
        btn.addEventListener('click', () => {
            btn.disabled = true;
            if (onContinue) onContinue();
        });

        btnContainer.appendChild(btn);

        // Insert after the summary if it exists, otherwise at the end
        if (this.elements.summary) {
            this.elements.summary.appendChild(btnContainer);
        } else {
            this.elements.wrapper.appendChild(btnContainer);
        }

        // Focus the button for accessibility
        requestAnimationFrame(() => btn.focus());
    }

    /**
     * Actualiza la barra de progreso del timer.
     */
    updateTimer(remaining, total) {
        if (!this.elements.timer || !this.elements.timerFill) return;
        const pct = total > 0 ? Math.max(0, (remaining / total) * 100) : 0;
        this.elements.timerFill.style.width = `${pct}%`;
        this.elements.timer.setAttribute('aria-valuenow', String(Math.round(pct)));
    }

    /**
     * Anuncia un mensaje en la región aria-live polite.
     */
    announcePolite(message) {
        if (!this.elements.livePolite) return;
        this.elements.livePolite.textContent = '';
        // Forzar re-anuncio con un pequeño delay
        requestAnimationFrame(() => {
            if (this.elements.livePolite) {
                this.elements.livePolite.textContent = message;
            }
        });
    }

    /**
     * Anuncia un mensaje en la región aria-live assertive.
     */
    announceAssertive(message) {
        if (!this.elements.liveAssertive) return;
        this.elements.liveAssertive.textContent = '';
        requestAnimationFrame(() => {
            if (this.elements.liveAssertive) {
                this.elements.liveAssertive.textContent = message;
            }
        });
    }

    /**
     * Limpia DOM y listeners.
     */
    destroy() {
        // Remove keyboard handler
        if (this.elements.wrapper && this._keyboardHandler) {
            this.elements.wrapper.removeEventListener('keydown', this._keyboardHandler);
            this._keyboardHandler = null;
        }
        this._keyboardSelectedItemId = null;

        if (this.elements.wrapper && this.elements.wrapper.parentNode) {
            this.elements.wrapper.parentNode.removeChild(this.elements.wrapper);
        }
        // Remover stylesheet inyectado
        const style = document.getElementById('oc-view-styles');
        if (style && style.parentNode) {
            style.parentNode.removeChild(style);
        }
        this.elements = {};
        this.items = [];
        this.zones = [];
    }

    // ─── Keyboard Navigation ────────────────────────────────────────────

    /**
     * Sets up keyboard navigation via event delegation on the wrapper.
     * - Enter/Space on an item: select it for keyboard assignment
     * - Enter/Space on a zone: assign the keyboard-selected item to that zone
     * - Arrow keys on a zone: move focus between zones
     * - After assignment: move focus to next pending item or verify button
     */
    _setupKeyboardNavigation() {
        if (!this.elements.wrapper) return;

        this._keyboardHandler = (e) => {
            const target = e.target;
            const key = e.key;

            // Handle Enter or Space
            if (key === 'Enter' || key === ' ') {
                e.preventDefault();

                // Target is an item
                if (target.classList.contains('oc-item')) {
                    this._handleKeyboardItemActivation(target);
                    return;
                }

                // Target is a zone
                if (target.classList.contains('oc-zone')) {
                    this._handleKeyboardZoneActivation(target);
                    return;
                }
            }

            // Arrow keys for zone navigation
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) {
                if (target.classList.contains('oc-zone')) {
                    e.preventDefault();
                    this._handleArrowNavigation(target, key);
                }
            }
        };

        this.elements.wrapper.addEventListener('keydown', this._keyboardHandler);
    }

    /**
     * Handles Enter/Space on an item element.
     * Toggles keyboard selection state.
     */
    _handleKeyboardItemActivation(itemEl) {
        const itemId = itemEl.getAttribute('data-item-id');
        if (!itemId) return;

        // If this item is already keyboard-selected, deselect it
        if (this._keyboardSelectedItemId === itemId) {
            this._clearKeyboardSelection();
            return;
        }

        // Clear previous selection
        this._clearKeyboardSelection();

        // Select this item
        this._keyboardSelectedItemId = itemId;
        itemEl.classList.add('oc-item--selected');
        itemEl.setAttribute('aria-pressed', 'true');
    }

    /**
     * Handles Enter/Space on a zone element.
     * If there's a keyboard-selected item, assigns it to this zone.
     */
    _handleKeyboardZoneActivation(zoneEl) {
        if (!this._keyboardSelectedItemId) return;

        const zoneId = zoneEl.getAttribute('data-zone-id');
        if (!zoneId) return;

        const itemId = this._keyboardSelectedItemId;

        // Clear keyboard selection state
        this._clearKeyboardSelection();

        // Invoke the onAssign callback
        if (this.onAssign) {
            this.onAssign(itemId, zoneId);
        }

        // Move focus to next pending item or verify button
        this._moveFocusAfterAssignment();
    }

    /**
     * Clears the current keyboard selection state.
     */
    _clearKeyboardSelection() {
        if (this._keyboardSelectedItemId) {
            const prevEl = this.container.querySelector(
                `[data-item-id="${this._keyboardSelectedItemId}"]`
            );
            if (prevEl) {
                prevEl.classList.remove('oc-item--selected');
                prevEl.removeAttribute('aria-pressed');
            }
            this._keyboardSelectedItemId = null;
        }
    }

    /**
     * Handles arrow key navigation between zones.
     * Moves focus to the adjacent zone in the direction pressed.
     */
    _handleArrowNavigation(currentZone, key) {
        const allZones = Array.from(
            this.elements.zonesContainer.querySelectorAll('.oc-zone')
        );
        const currentIndex = allZones.indexOf(currentZone);
        if (currentIndex === -1) return;

        let nextIndex;
        if (key === 'ArrowDown' || key === 'ArrowRight') {
            nextIndex = (currentIndex + 1) % allZones.length;
        } else {
            // ArrowUp or ArrowLeft
            nextIndex = (currentIndex - 1 + allZones.length) % allZones.length;
        }

        allZones[nextIndex].focus();
    }

    /**
     * After an assignment, moves focus to the next pending item in the panel.
     * If no pending items remain, moves focus to the verify button.
     */
    _moveFocusAfterAssignment() {
        const nextItem = this._getNextPendingItem();
        if (nextItem) {
            nextItem.focus();
        } else if (this.elements.verifyBtn) {
            this.elements.verifyBtn.focus();
        }
    }

    /**
     * Returns the next pending item element in the panel, or null if none remain.
     */
    _getNextPendingItem() {
        if (!this.elements.panel) return null;
        return this.elements.panel.querySelector('.oc-item');
    }

    // ─── Helpers ───────────────────────────────────────────────────────

    /**
     * Obtiene una etiqueta legible para un ítem (para anuncios aria-live).
     */
    _getItemLabel(itemEl) {
        const img = itemEl.querySelector('.oc-item__flag');
        if (img) return img.alt || 'Bandera';
        const label = itemEl.querySelector('.oc-item__label');
        if (label) return label.textContent;
        const fallback = itemEl.querySelector('.oc-item__fallback');
        if (fallback) return fallback.textContent;
        return 'Ítem';
    }

    /**
     * Obtiene la etiqueta en español de un continente por su id o nombre.
     */
    _getContinentLabel(continentId) {
        const zone = this.zones.find(z => z.id === continentId || z.continent === continentId);
        return zone ? zone.label : continentId;
    }

    // ─── Estilos ────────────────────────────────────────────────────────

    _injectStyles() {
        if (document.getElementById('oc-view-styles')) return;

        const style = document.createElement('style');
        style.id = 'oc-view-styles';
        style.textContent = `
/* ═══════════════════════════════════════════════════════════════
   ORDENA POR CONTINENTE — View Styles
   Design System: Editorial Luxe tokens
   ═══════════════════════════════════════════════════════════════ */

.oc-wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    padding: var(--space-xs);
    background: var(--cream-bg);
    border-radius: var(--radius-lg);
}

/* ─── Header ─────────────────────────────────────────────────── */

.oc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-xs) var(--space-sm);
    background: var(--soft-sand);
    border-radius: var(--radius-md);
    border: 1px solid var(--warm-gray);
}

.oc-counter {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    color: var(--charcoal);
}

.oc-verify-btn {
    font-size: 0.85em;
    padding: 0.4em 0.9em;
    transition: opacity var(--duration-quick) var(--ease-gentle),
                transform var(--duration-quick) var(--ease-gentle);
}

/* ─── Timer Bar ──────────────────────────────────────────────── */

.oc-timer {
    height: 6px;
    background: var(--warm-gray);
    border-radius: var(--radius-pill);
    overflow: hidden;
}

.oc-timer__fill {
    height: 100%;
    width: 100%;
    background: linear-gradient(90deg, var(--sage) 0%, var(--deep-sage) 100%);
    border-radius: var(--radius-pill);
    transition: width var(--duration-moderate) var(--ease-gentle);
}

/* ─── Panel de Ítems ─────────────────────────────────────────── */

.oc-panel {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
    padding: var(--space-xs);
    background: var(--warm-white);
    border-radius: var(--radius-md);
    border: 1px solid var(--warm-gray);
}

/* ─── Ítems individuales ─────────────────────────────────────── */

.oc-item {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    min-height: 36px;
    padding: 3px;
    background: var(--cream-bg);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-soft);
    cursor: grab;
    transition: transform var(--duration-quick) var(--ease-gentle),
                box-shadow var(--duration-quick) var(--ease-gentle),
                opacity var(--duration-quick) var(--ease-gentle),
                border-color var(--duration-quick) var(--ease-gentle);
    border: 1.5px solid transparent;
    user-select: none;
}

.oc-item:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-medium);
}

.oc-item:focus-visible {
    outline: 2px solid var(--deep-sage);
    outline-offset: 2px;
}

.oc-item--selected {
    border-color: var(--terracotta);
    transform: scale(1.05);
    box-shadow: var(--shadow-medium);
}

.oc-item[aria-pressed="true"] {
    border-color: var(--deep-sage);
    transform: scale(1.05);
    box-shadow: 0 0 0 3px rgba(107, 154, 112, 0.3), var(--shadow-medium);
}

.oc-item--dragging {
    opacity: 0.5;
    cursor: grabbing;
}

.oc-item--correct {
    border-color: var(--sage);
    background: rgba(107, 154, 112, 0.1);
}

.oc-item--incorrect {
    border-color: var(--rust);
    background: rgba(160, 75, 56, 0.1);
}

.oc-item__flag {
    width: 100%;
    height: auto;
    max-height: 36px;
    object-fit: contain;
    border-radius: 2px;
    pointer-events: none;
}

.oc-item__label {
    font-family: var(--font-body);
    font-size: var(--fs-body-sm);
    font-weight: 500;
    color: var(--charcoal);
    text-align: center;
    word-break: break-word;
    pointer-events: none;
}

.oc-item__fallback {
    font-family: var(--font-body);
    font-size: var(--fs-body-sm);
    font-weight: 500;
    color: var(--charcoal);
    text-align: center;
}

/* ─── Zonas de Continente ────────────────────────────────────── */

.oc-zones {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-xs);
}

.oc-zone {
    padding: var(--space-xs) var(--space-sm);
    background: var(--cream-bg);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-soft);
    border: 1.5px solid var(--warm-gray);
    transition: border-color var(--duration-quick) var(--ease-gentle),
                background-color var(--duration-quick) var(--ease-gentle),
                box-shadow var(--duration-quick) var(--ease-gentle);
    min-height: 44px;
}

.oc-zone:focus-visible {
    outline: 2px solid var(--deep-sage);
    outline-offset: 2px;
}

.oc-zone--dragover {
    border-color: var(--terracotta);
    background: rgba(194, 105, 74, 0.05);
    box-shadow: var(--shadow-lifted);
}

.oc-zone__title {
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--ink);
    margin-bottom: 4px;
    padding-bottom: 3px;
    border-bottom: 1px solid var(--warm-gray);
}

.oc-zone__items {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-height: 24px;
}

/* ─── Screen reader only ─────────────────────────────────────── */

.oc-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

/* ─── Responsive Grid ────────────────────────────────────────── */

/* Tablet: 4 columnas (768px - 1023px) */
@media (max-width: 1023px) {
    .oc-panel {
        grid-template-columns: repeat(4, 1fr);
    }
}

/* Mobile: 3 columnas (<768px) */
@media (max-width: 767px) {
    .oc-panel {
        grid-template-columns: repeat(3, 1fr);
    }

    .oc-zones {
        grid-template-columns: repeat(2, 1fr);
    }

    .oc-zone__title {
        font-size: 0.85rem;
    }
}

/* Small mobile: 2 columnas (<480px) */
@media (max-width: 479px) {
    .oc-panel {
        grid-template-columns: repeat(2, 1fr);
    }

    .oc-zones {
        grid-template-columns: 1fr;
    }
}

/* ─── Reduced Motion ─────────────────────────────────────────── */

@media (prefers-reduced-motion: reduce) {
    .oc-item,
    .oc-zone,
    .oc-timer__fill,
    .oc-verify-btn,
    .oc-item--moving {
        transition-duration: 0ms;
    }

    .oc-item:hover {
        transform: none;
    }

    .oc-item--selected {
        transform: none;
    }
}

/* ─── Animación de movimiento ────────────────────────────────── */

.oc-item--moving {
    opacity: 0.6;
    transform: scale(0.95);
    transition: opacity var(--duration-moderate) var(--ease-gentle),
                transform var(--duration-moderate) var(--ease-gentle);
}

/* ─── Badge de continente correcto ───────────────────────────── */

.oc-item__correct-zone {
    display: block;
    font-family: var(--font-body);
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--rust);
    background: rgba(160, 75, 56, 0.1);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    margin-top: 4px;
    text-align: center;
    pointer-events: none;
}

/* ─── Resumen final ──────────────────────────────────────────── */

.oc-summary {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-lg);
    background: var(--warm-white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lifted);
    border: 1px solid var(--warm-gray);
    margin-top: var(--space-md);
}

.oc-summary__title {
    font-family: var(--font-display);
    font-size: 1.4rem;
    font-weight: 400;
    color: var(--ink);
    margin: 0;
}

.oc-summary__stats {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
}

.oc-summary__stat {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    margin: 0;
}

.oc-summary__stat--correct {
    color: var(--sage);
    font-weight: 600;
}

.oc-summary__stat--incorrect {
    color: var(--rust);
    font-weight: 600;
}

.oc-summary__score {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 400;
    color: var(--charcoal);
    margin: 0;
}

.oc-summary__time {
    font-family: var(--font-body);
    font-size: var(--fs-body-sm);
    color: var(--charcoal);
    margin: 0;
}

/* ─── Botón Continuar ────────────────────────────────────────── */

.oc-continue-container {
    display: flex;
    justify-content: center;
    margin-top: var(--space-md);
}

.oc-continue-btn {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    color: var(--warm-white);
    background: var(--deep-sage);
    border: none;
    border-radius: var(--radius-md);
    padding: var(--space-sm) var(--space-xl);
    cursor: pointer;
    transition: background-color var(--duration-quick) var(--ease-gentle),
                transform var(--duration-quick) var(--ease-gentle);
    min-height: 44px;
}

.oc-continue-btn:hover {
    background: var(--sage);
    transform: translateY(-1px);
}

.oc-continue-btn:active {
    transform: translateY(0);
}

.oc-continue-btn:focus-visible {
    outline: 2px solid var(--deep-sage);
    outline-offset: 2px;
}

.oc-continue-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}
`;
        document.head.appendChild(style);
    }
}
