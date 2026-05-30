/**
 * TapToAssignHandler — Maneja la interacción tap-to-assign para dispositivos táctiles.
 *
 * Gestiona el estado de selección de ítems: tap en ítem selecciona,
 * tap en zona asigna, tap en mismo ítem deselecciona, tap fuera deselecciona.
 *
 * Solo se instancia en dispositivos con pointer grueso (touch/mobile).
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

export class TapToAssignHandler {
    /**
     * @param {HTMLElement} container - Contenedor DOM con ítems (.oc-item) y zonas (.oc-zone)
     * @param {Object} callbacks
     * @param {function(string): void} callbacks.onSelect - Invocado al seleccionar un ítem (recibe itemId)
     * @param {function(string, string): void} callbacks.onAssign - Invocado al asignar ítem a zona (itemId, zoneId)
     * @param {function(string): void} callbacks.onDeselect - Invocado al deseleccionar un ítem (recibe itemId)
     */
    constructor(container, { onSelect, onAssign, onDeselect }) {
        this._container = container;
        this._onSelect = onSelect;
        this._onAssign = onAssign;
        this._onDeselect = onDeselect;

        this._selectedItemId = null;
        this._enabled = false;

        // Bind handler para poder removerlo después
        this._handleClick = this._handleClick.bind(this);
    }

    /**
     * Habilita la interacción tap-to-assign.
     */
    enable() {
        if (this._enabled) return;
        this._enabled = true;
        this._container.addEventListener('click', this._handleClick);
    }

    /**
     * Deshabilita la interacción tap-to-assign (usado después de evaluación).
     */
    disable() {
        if (!this._enabled) return;
        this._enabled = false;
        this._container.removeEventListener('click', this._handleClick);
        this._clearSelection();
    }

    /**
     * Destruye el handler, removiendo todos los event listeners.
     */
    destroy() {
        this._container.removeEventListener('click', this._handleClick);
        this._clearSelection();
        this._enabled = false;
    }

    /**
     * Retorna el ID del ítem actualmente seleccionado, o null si no hay selección.
     * @returns {string|null}
     */
    getSelectedItemId() {
        return this._selectedItemId;
    }

    /**
     * Handler principal de click/tap.
     * @param {Event} event
     * @private
     */
    _handleClick(event) {
        const target = event.target;

        // Verificar si se tocó un ítem
        const itemEl = target.closest('.oc-item');
        if (itemEl) {
            this._handleItemTap(itemEl);
            return;
        }

        // Verificar si se tocó una zona
        const zoneEl = target.closest('.oc-zone');
        if (zoneEl) {
            this._handleZoneTap(zoneEl);
            return;
        }

        // Tap fuera de ítems y zonas → deseleccionar
        if (this._selectedItemId) {
            const previousId = this._selectedItemId;
            this._clearSelection();
            this._onDeselect(previousId);
        }
    }

    /**
     * Maneja tap en un ítem.
     * @param {HTMLElement} itemEl
     * @private
     */
    _handleItemTap(itemEl) {
        const itemId = itemEl.dataset.itemId;
        if (!itemId) return;

        if (this._selectedItemId === null) {
            // No hay selección → seleccionar este ítem
            this._selectItem(itemId, itemEl);
        } else if (this._selectedItemId === itemId) {
            // Mismo ítem → deseleccionar
            const previousId = this._selectedItemId;
            this._clearSelection();
            this._onDeselect(previousId);
        } else {
            // Otro ítem → cambiar selección
            this._clearSelection();
            this._selectItem(itemId, itemEl);
        }
    }

    /**
     * Maneja tap en una zona.
     * @param {HTMLElement} zoneEl
     * @private
     */
    _handleZoneTap(zoneEl) {
        if (this._selectedItemId === null) return;

        const zoneId = zoneEl.dataset.zoneId;
        if (!zoneId) return;

        const itemId = this._selectedItemId;
        this._clearSelection();
        this._onAssign(itemId, zoneId);
    }

    /**
     * Selecciona un ítem: agrega clase visual y actualiza estado.
     * @param {string} itemId
     * @param {HTMLElement} itemEl
     * @private
     */
    _selectItem(itemId, itemEl) {
        this._selectedItemId = itemId;
        itemEl.classList.add('oc-item--selected');
        this._onSelect(itemId);
    }

    /**
     * Limpia la selección actual: remueve clase visual y resetea estado.
     * @private
     */
    _clearSelection() {
        if (this._selectedItemId === null) return;

        const selectedEl = this._container.querySelector(
            `.oc-item[data-item-id="${this._selectedItemId}"]`
        );
        if (selectedEl) {
            selectedEl.classList.remove('oc-item--selected');
        }

        this._selectedItemId = null;
    }
}
