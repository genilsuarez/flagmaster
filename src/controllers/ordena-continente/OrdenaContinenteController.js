/**
 * OrdenaContinenteController
 *
 * Controller principal del modo "Ordena por Continente".
 * Sigue la interfaz IModeController: start(), stop(), destroy().
 *
 * El jugador clasifica banderas o capitales en zonas de continente.
 * Soporta drag-and-drop (escritorio) y tap-to-assign (móvil).
 * La evaluación es batch (todos los ítems a la vez).
 *
 * Requirements: 10.1, 10.2, 10.3, 7.1, 7.2, 7.3, 7.4, 8.1, 8.6, 9.2, 9.3, 9.4
 */

import { generateSession } from './SessionGenerator.js';
import { evaluate } from './EvaluationEngine.js';
import { OrdenaContinenteView } from '../../views/OrdenaContinenteView.js';
import { DragDropHandler } from './DragDropHandler.js';
import { TapToAssignHandler } from './TapToAssignHandler.js';

export class OrdenaContinenteController {
    /**
     * @param {Object} options
     * @param {HTMLElement} options.container - Parent element to render the game UI into
     * @param {function} [options.onRoundEnd] - Callback after round completes
     * @param {function} [options.onGameEnd] - Callback when game ends with session data
     */
    constructor({ container, onRoundEnd = null, onGameEnd = null }) {
        this.container = container;
        this.onRoundEnd = onRoundEnd;
        this.onGameEnd = onGameEnd;

        // View
        this._view = null;

        // Interaction handler (DragDrop or TapToAssign)
        this._handler = null;

        // Session state
        this._state = null;

        // Timer
        this._timerInterval = null;
        this._timerRemaining = 0;
        this._timerPaused = false;

        // Visibility change handler
        this._visibilityHandler = null;

        // Public state
        this.roundHistory = [];
        this.isActive = false;
    }

    /**
     * Starts a new Ordena por Continente session.
     * @param {Array} pool - Filtered country pool from flags.json
     * @param {Object} modeOptions - Mode-specific options
     * @param {number} modeOptions.itemCount - Number of items
     * @param {string[]} modeOptions.continents - Selected continents
     * @param {'flags'|'capitals'} modeOptions.itemType - Item display type
     * @param {'off'|'on'} modeOptions.timerMode - Timer mode
     * @param {number} [modeOptions.timeLimit] - Time limit in seconds (if timerMode is 'on')
     */
    start(pool, modeOptions = {}) {
        // Generate session data
        const { items, zones } = generateSession(pool, modeOptions);

        // Initialize session state
        this._state = {
            items,
            zones,
            assignments: new Map(),
            pendingItems: new Set(items.map(item => item.id)),
            isEvaluated: false,
            startTime: Date.now(),
            timerEnabled: modeOptions.timerMode === 'on',
            timeLimit: modeOptions.timerMode === 'on' ? (modeOptions.timeLimit || 120) : null,
            results: null,
        };

        this.isActive = true;
        this.roundHistory = [];

        // Create view
        this._view = new OrdenaContinenteView(this.container);
        this._view.render(items, zones, {
            timerEnabled: this._state.timerEnabled,
            timeLimit: this._state.timeLimit,
        });

        // Wire view callbacks
        this._view.onVerify = () => this._handleVerify();
        this._view.onUnassign = (itemId) => this._handleUnassign(itemId);

        // Detect pointer type and instantiate appropriate handler
        const isFinPointer = window.matchMedia('(pointer: fine)').matches;

        if (isFinPointer) {
            this._handler = new DragDropHandler(this.container, {
                onDragStart: () => {},
                onDrop: (itemId, zoneId) => {
                    if (this._state.assignments.has(itemId)) {
                        this._handleReassign(itemId, zoneId);
                    } else {
                        this._handleAssign(itemId, zoneId);
                    }
                },
                onDragCancel: () => {},
            });
            this._handler.enable();
        } else {
            this._handler = new TapToAssignHandler(this.container, {
                onSelect: (itemId) => {
                    this._view.updateItemState(itemId, { selected: true });
                },
                onAssign: (itemId, zoneId) => {
                    if (this._state.assignments.has(itemId)) {
                        this._handleReassign(itemId, zoneId);
                    } else {
                        this._handleAssign(itemId, zoneId);
                    }
                },
                onDeselect: (itemId) => {
                    this._view.updateItemState(itemId, { selected: false });
                },
            });
            this._handler.enable();
        }

        // Start timer if enabled
        if (this._state.timerEnabled && this._state.timeLimit) {
            this._startTimer(this._state.timeLimit);
        }
    }

    /**
     * Handles assigning an item to a zone.
     * Updates state, moves item in view, updates counter, enables verify if complete.
     * @param {string} itemId
     * @param {string} zoneId
     * @private
     */
    _handleAssign(itemId, zoneId) {
        if (this._state.isEvaluated) return;

        // Update state
        this._state.assignments.set(itemId, zoneId);
        this._state.pendingItems.delete(itemId);

        // Update zone state
        const zone = this._state.zones.find(z => z.id === zoneId);
        if (zone) {
            if (!zone.assignedItems) zone.assignedItems = [];
            zone.assignedItems.push(itemId);
        }

        // Update view
        this._view.moveItemToZone(itemId, zoneId);

        // Update counter
        const pending = this._state.pendingItems.size;
        const total = this._state.items.length;
        this._view.updateCounter(pending, total);

        // Enable verify button if no pending items
        if (pending === 0) {
            this._view.setVerifyEnabled(true);
            // Move focus to verify button
            if (this._view.elements && this._view.elements.verifyBtn) {
                this._view.elements.verifyBtn.focus();
            }
        }
    }

    /**
     * Handles unassigning an item (returning it to the panel).
     * @param {string} itemId
     * @private
     */
    _handleUnassign(itemId) {
        if (this._state.isEvaluated) return;
        if (!this._state.assignments.has(itemId)) return;

        // Get the zone it was assigned to
        const zoneId = this._state.assignments.get(itemId);

        // Update state
        this._state.assignments.delete(itemId);
        this._state.pendingItems.add(itemId);

        // Update zone state
        const zone = this._state.zones.find(z => z.id === zoneId);
        if (zone && zone.assignedItems) {
            const idx = zone.assignedItems.indexOf(itemId);
            if (idx !== -1) zone.assignedItems.splice(idx, 1);
        }

        // Update view
        this._view.moveItemToPanel(itemId);

        // Update counter
        const pending = this._state.pendingItems.size;
        const total = this._state.items.length;
        this._view.updateCounter(pending, total);

        // Disable verify button since there are pending items
        this._view.setVerifyEnabled(false);
    }

    /**
     * Handles reassigning an item from one zone to another without passing through the panel.
     * @param {string} itemId
     * @param {string} newZoneId
     * @private
     */
    _handleReassign(itemId, newZoneId) {
        if (this._state.isEvaluated) return;

        const oldZoneId = this._state.assignments.get(itemId);
        if (oldZoneId === newZoneId) return; // Same zone, no-op

        // Update state: change assignment
        this._state.assignments.set(itemId, newZoneId);

        // Update old zone state
        const oldZone = this._state.zones.find(z => z.id === oldZoneId);
        if (oldZone && oldZone.assignedItems) {
            const idx = oldZone.assignedItems.indexOf(itemId);
            if (idx !== -1) oldZone.assignedItems.splice(idx, 1);
        }

        // Update new zone state
        const newZone = this._state.zones.find(z => z.id === newZoneId);
        if (newZone) {
            if (!newZone.assignedItems) newZone.assignedItems = [];
            newZone.assignedItems.push(itemId);
        }

        // Update view: move item to new zone
        this._view.moveItemToZone(itemId, newZoneId);
    }

    /**
     * Handles the verify action: evaluates assignments, freezes state, shows results.
     * @private
     */
    _handleVerify() {
        if (this._state.isEvaluated) return;

        // Stop timer if running
        this._stopTimer();

        // Freeze state
        this._state.isEvaluated = true;

        // Disable interaction handler
        if (this._handler) {
            this._handler.disable();
        }

        // Build assignments map using zone continent names (not zone IDs)
        const assignmentsByContinent = new Map();
        for (const [itemId, zoneId] of this._state.assignments) {
            const zone = this._state.zones.find(z => z.id === zoneId);
            const continent = zone ? zone.continent : zoneId;
            assignmentsByContinent.set(itemId, continent);
        }

        // Evaluate
        const evalResult = evaluate(assignmentsByContinent, this._state.items);
        this._state.results = evalResult;

        // Show results in view (inline feedback: green/red on each item)
        this._view.showResults(evalResult.results);

        // Calculate time elapsed
        const timeElapsed = Math.round((Date.now() - this._state.startTime) / 1000);
        const minutes = Math.floor(timeElapsed / 60);
        const seconds = timeElapsed % 60;
        const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        // Show summary inline (not as a blocking overlay)
        this._view.showSummary({
            correct: evalResult.correct,
            incorrect: evalResult.incorrect,
            score: evalResult.score,
            timeFormatted,
        });

        // Build round history entry
        const roundEntry = {
            score: evalResult.score,
            correct: evalResult.correct,
            incorrect: evalResult.incorrect,
            total: this._state.items.length,
            timeElapsed,
            results: evalResult.results,
        };
        this.roundHistory = [roundEntry];

        // Invoke onRoundEnd
        if (this.onRoundEnd) {
            this.onRoundEnd(roundEntry);
        }

        // Show continue button — user reviews inline feedback before ending
        this._showContinueButton(evalResult);

        this.isActive = false;
    }

    /**
     * Handles timeout: cancels active drag, evaluates with current state,
     * marks pending items as incorrect.
     * @private
     */
    _handleTimeout() {
        if (this._state.isEvaluated) return;

        // Stop timer
        this._stopTimer();

        // Disable interaction handler (cancels any active drag)
        if (this._handler) {
            this._handler.disable();
        }

        // Freeze state
        this._state.isEvaluated = true;

        // For pending items, assign them to a dummy zone so they count as incorrect
        // The evaluate function will mark them incorrect since null !== their real continent
        // We leave them unassigned (null) in the assignments map

        // Build assignments map using zone continent names
        const assignmentsByContinent = new Map();
        for (const [itemId, zoneId] of this._state.assignments) {
            const zone = this._state.zones.find(z => z.id === zoneId);
            const continent = zone ? zone.continent : zoneId;
            assignmentsByContinent.set(itemId, continent);
        }

        // Pending items get null assignment (will be marked incorrect by evaluate)
        for (const itemId of this._state.pendingItems) {
            assignmentsByContinent.set(itemId, null);
        }

        // Evaluate
        const evalResult = evaluate(assignmentsByContinent, this._state.items);
        this._state.results = evalResult;

        // Show results in view (inline feedback)
        this._view.showResults(evalResult.results);

        // Calculate time elapsed (equals timeLimit since timeout)
        const timeElapsed = this._state.timeLimit;
        const minutes = Math.floor(timeElapsed / 60);
        const seconds = timeElapsed % 60;
        const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        // Show summary inline
        this._view.showSummary({
            correct: evalResult.correct,
            incorrect: evalResult.incorrect,
            score: evalResult.score,
            timeFormatted,
        });

        // Build round history entry
        const roundEntry = {
            score: evalResult.score,
            correct: evalResult.correct,
            incorrect: evalResult.incorrect,
            total: this._state.items.length,
            timeElapsed,
            results: evalResult.results,
        };
        this.roundHistory = [roundEntry];

        // Invoke onRoundEnd
        if (this.onRoundEnd) {
            this.onRoundEnd(roundEntry);
        }

        // Show continue button — user reviews inline feedback before ending
        this._showContinueButton(evalResult);

        this.isActive = false;
    }

    /**
     * Shows a "Continuar" button so the user can review inline feedback
     * before the game-end modal appears.
     * @param {Object} evalResult - Evaluation result from EvaluationEngine
     * @private
     */
    _showContinueButton(evalResult) {
        this._view.showContinueButton(() => {
            if (this.onGameEnd) {
                this.onGameEnd({
                    totalScore: evalResult.score,
                    roundHistory: this.roundHistory,
                    totalRounds: 1,
                });
            }
        });
    }

    /**
     * Starts a countdown timer.
     * Pauses on document visibility hidden, resumes on visible.
     * @param {number} seconds - Total seconds for the timer
     * @private
     */
    _startTimer(seconds) {
        this._timerRemaining = seconds;
        this._timerPaused = false;

        // Initial render
        this._view.updateTimer(this._timerRemaining, seconds);

        this._timerInterval = setInterval(() => {
            if (this._timerPaused) return;

            this._timerRemaining--;
            this._view.updateTimer(this._timerRemaining, this._state.timeLimit);

            if (this._timerRemaining <= 0) {
                this._handleTimeout();
            }
        }, 1000);

        // Visibility change handler: pause on hidden, resume on visible
        this._visibilityHandler = () => {
            if (document.hidden) {
                this._timerPaused = true;
            } else {
                this._timerPaused = false;
            }
        };
        document.addEventListener('visibilitychange', this._visibilityHandler);
    }

    /**
     * Stops the timer and removes visibility listener.
     * @private
     */
    _stopTimer() {
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
        }
        if (this._visibilityHandler) {
            document.removeEventListener('visibilitychange', this._visibilityHandler);
            this._visibilityHandler = null;
        }
    }

    /**
     * Stops the session without triggering onGameEnd.
     * Used by GameSessionManager.endSession().
     */
    stop() {
        this._stopTimer();

        if (this._handler) {
            this._handler.disable();
        }

        this.isActive = false;
    }

    /**
     * Destroys the controller, cleaning up timer, handlers, and view.
     */
    destroy() {
        this.stop();

        if (this._handler) {
            this._handler.destroy();
            this._handler = null;
        }

        if (this._view) {
            this._view.destroy();
            this._view = null;
        }

        this._state = null;
    }
}
