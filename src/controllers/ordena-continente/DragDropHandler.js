/**
 * DragDropHandler - Maneja eventos de drag-and-drop nativos del navegador.
 * Solo se instancia en dispositivos con pointer fino (escritorio).
 *
 * Usa la HTML5 Drag and Drop API con los atributos:
 * - `data-item-id` en elementos arrastrables (.oc-item)
 * - `data-zone-id` en zonas de destino (.oc-zone)
 *
 * @param {HTMLElement} container - Contenedor raíz del juego
 * @param {Object} callbacks
 * @param {function(string): void} callbacks.onDragStart - Invocado al iniciar drag con itemId
 * @param {function(string, string): void} callbacks.onDrop - Invocado al soltar en zona válida (itemId, zoneId)
 * @param {function(string): void} callbacks.onDragCancel - Invocado al soltar fuera de zona válida (itemId)
 */
export class DragDropHandler {
    constructor(container, { onDragStart, onDrop, onDragCancel }) {
        this._container = container;
        this._onDragStart = onDragStart;
        this._onDrop = onDrop;
        this._onDragCancel = onDragCancel;

        this._enabled = false;
        this._draggedItemId = null;
        this._sourceElement = null;
        this._dropOccurred = false;
        this._dragleaveTimers = new Map();

        // Bind handlers para poder removerlos después
        this._handleDragStart = this._handleDragStart.bind(this);
        this._handleDragOver = this._handleDragOver.bind(this);
        this._handleDragLeave = this._handleDragLeave.bind(this);
        this._handleDrop = this._handleDrop.bind(this);
        this._handleDragEnd = this._handleDragEnd.bind(this);
    }

    /**
     * Habilita la interacción drag-and-drop.
     * Agrega event listeners al container y marca ítems como draggable.
     */
    enable() {
        if (this._enabled) return;
        this._enabled = true;

        this._container.addEventListener('dragstart', this._handleDragStart);
        this._container.addEventListener('dragover', this._handleDragOver);
        this._container.addEventListener('dragleave', this._handleDragLeave);
        this._container.addEventListener('drop', this._handleDrop);
        this._container.addEventListener('dragend', this._handleDragEnd);

        this._setItemsDraggable(true);
    }

    /**
     * Deshabilita la interacción drag-and-drop.
     * Remueve la capacidad de arrastre sin destruir listeners (permite re-enable).
     */
    disable() {
        if (!this._enabled) return;
        this._enabled = false;

        this._setItemsDraggable(false);
        this._clearAllHighlights();
        this._clearAllTimers();
    }

    /**
     * Destruye el handler removiendo todos los event listeners.
     * Después de llamar destroy(), el handler no puede reutilizarse.
     */
    destroy() {
        this.disable();

        this._container.removeEventListener('dragstart', this._handleDragStart);
        this._container.removeEventListener('dragover', this._handleDragOver);
        this._container.removeEventListener('dragleave', this._handleDragLeave);
        this._container.removeEventListener('drop', this._handleDrop);
        this._container.removeEventListener('dragend', this._handleDragEnd);

        this._container = null;
        this._onDragStart = null;
        this._onDrop = null;
        this._onDragCancel = null;
    }

    // --- Handlers internos ---

    _handleDragStart(e) {
        if (!this._enabled) return;

        const item = e.target.closest('.oc-item[data-item-id]');
        if (!item) return;

        const itemId = item.dataset.itemId;
        this._draggedItemId = itemId;
        this._sourceElement = item;
        this._dropOccurred = false;

        // Configurar dataTransfer
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', itemId);

        // Opacidad reducida en el elemento fuente
        requestAnimationFrame(() => {
            if (this._sourceElement) {
                this._sourceElement.classList.add('oc-item--dragging');
            }
        });

        if (this._onDragStart) {
            this._onDragStart(itemId);
        }
    }

    _handleDragOver(e) {
        if (!this._enabled || !this._draggedItemId) return;

        const zone = e.target.closest('.oc-zone[data-zone-id]');
        if (!zone) return;

        // Prevenir default para permitir drop
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const zoneId = zone.dataset.zoneId;

        // Cancelar timer de dragleave pendiente para esta zona
        if (this._dragleaveTimers.has(zoneId)) {
            clearTimeout(this._dragleaveTimers.get(zoneId));
            this._dragleaveTimers.delete(zoneId);
        }

        // Agregar highlight
        zone.classList.add('oc-zone--dragover');
    }

    _handleDragLeave(e) {
        if (!this._enabled || !this._draggedItemId) return;

        const zone = e.target.closest('.oc-zone[data-zone-id]');
        if (!zone) return;

        const zoneId = zone.dataset.zoneId;

        // Verificar que realmente salimos de la zona (no un hijo interno)
        const relatedTarget = e.relatedTarget;
        if (relatedTarget && zone.contains(relatedTarget)) return;

        // Revert con delay de 150ms para UX suave
        const timer = setTimeout(() => {
            zone.classList.remove('oc-zone--dragover');
            this._dragleaveTimers.delete(zoneId);
        }, 150);

        this._dragleaveTimers.set(zoneId, timer);
    }

    _handleDrop(e) {
        if (!this._enabled) return;

        const zone = e.target.closest('.oc-zone[data-zone-id]');
        if (!zone) return;

        e.preventDefault();

        const itemId = e.dataTransfer.getData('text/plain');
        const zoneId = zone.dataset.zoneId;

        if (!itemId || !zoneId) return;

        this._dropOccurred = true;

        // Limpiar highlight de la zona
        zone.classList.remove('oc-zone--dragover');

        // Cancelar timer de dragleave si existe
        if (this._dragleaveTimers.has(zoneId)) {
            clearTimeout(this._dragleaveTimers.get(zoneId));
            this._dragleaveTimers.delete(zoneId);
        }

        // Invocar callback
        if (this._onDrop) {
            this._onDrop(itemId, zoneId);
        }
    }

    _handleDragEnd(e) {
        if (!this._enabled) return;

        // Restaurar opacidad del elemento fuente
        if (this._sourceElement) {
            this._sourceElement.classList.remove('oc-item--dragging');
        }

        // Si no hubo drop en zona válida, invocar cancel
        if (!this._dropOccurred && this._draggedItemId) {
            if (this._sourceElement) {
                this._sourceElement.classList.add('oc-item--returning');
                setTimeout(() => {
                    if (this._sourceElement) {
                        this._sourceElement.classList.remove('oc-item--returning');
                    }
                }, 300);
            }

            if (this._onDragCancel) {
                this._onDragCancel(this._draggedItemId);
            }
        }

        // Limpiar highlights residuales
        this._clearAllHighlights();
        this._clearAllTimers();

        // Reset estado
        this._draggedItemId = null;
        this._sourceElement = null;
        this._dropOccurred = false;
    }

    // --- Utilidades internas ---

    /**
     * Marca o desmarca todos los ítems como draggable.
     */
    _setItemsDraggable(draggable) {
        const items = this._container.querySelectorAll('.oc-item[data-item-id]');
        items.forEach(item => {
            item.draggable = draggable;
            if (draggable) {
                item.setAttribute('draggable', 'true');
            } else {
                item.removeAttribute('draggable');
            }
        });
    }

    /**
     * Remueve la clase de highlight de todas las zonas.
     */
    _clearAllHighlights() {
        if (!this._container) return;
        const zones = this._container.querySelectorAll('.oc-zone--dragover');
        zones.forEach(zone => zone.classList.remove('oc-zone--dragover'));
    }

    /**
     * Limpia todos los timers de dragleave pendientes.
     */
    _clearAllTimers() {
        for (const timer of this._dragleaveTimers.values()) {
            clearTimeout(timer);
        }
        this._dragleaveTimers.clear();
    }
}
