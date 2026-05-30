import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OrdenaContinenteView } from './OrdenaContinenteView.js';

describe('OrdenaContinenteView', () => {
    let container;
    let view;

    const mockItems = [
        { id: 'item-1', countryId: 'AR', continent: 'America', flagUrl: '/flags/ar.svg', capital: 'Buenos Aires', displayValue: '/flags/ar.svg', displayType: 'flag' },
        { id: 'item-2', countryId: 'FR', continent: 'Europe', flagUrl: '/flags/fr.svg', capital: 'París', displayValue: '/flags/fr.svg', displayType: 'flag' },
        { id: 'item-3', countryId: 'JP', continent: 'Asia', flagUrl: '/flags/jp.svg', capital: 'Tokio', displayValue: 'Tokio', displayType: 'capital' },
        { id: 'item-4', countryId: 'NG', continent: 'Africa', flagUrl: '/flags/ng.svg', capital: 'Abuya', displayValue: 'Abuya', displayType: 'capital' },
    ];

    const mockZones = [
        { id: 'zone-america', continent: 'America', label: 'América' },
        { id: 'zone-europe', continent: 'Europe', label: 'Europa' },
        { id: 'zone-asia', continent: 'Asia', label: 'Asia' },
        { id: 'zone-africa', continent: 'Africa', label: 'África' },
    ];

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        view = new OrdenaContinenteView(container);
    });

    afterEach(() => {
        view.destroy();
        document.body.removeChild(container);
    });

    describe('render()', () => {
        it('crea la estructura DOM completa', () => {
            view.render(mockItems, mockZones, {});

            expect(container.querySelector('.oc-wrapper')).not.toBeNull();
            expect(container.querySelector('.oc-header')).not.toBeNull();
            expect(container.querySelector('.oc-panel')).not.toBeNull();
            expect(container.querySelector('.oc-zones')).not.toBeNull();
        });

        it('Panel_Ítems tiene role="list"', () => {
            view.render(mockItems, mockZones, {});
            const panel = container.querySelector('.oc-panel');
            expect(panel.getAttribute('role')).toBe('list');
        });

        it('cada ítem tiene role="listitem"', () => {
            view.render(mockItems, mockZones, {});
            const items = container.querySelectorAll('[role="listitem"]');
            expect(items.length).toBe(4);
        });

        it('renderiza una zona por cada continente con role="region"', () => {
            view.render(mockItems, mockZones, {});
            const zones = container.querySelectorAll('[role="region"]');
            expect(zones.length).toBe(4);
        });

        it('cada zona tiene aria-label con nombre del continente', () => {
            view.render(mockItems, mockZones, {});
            const zones = container.querySelectorAll('[role="region"]');
            const labels = Array.from(zones).map(z => z.getAttribute('aria-label'));
            expect(labels).toContain('América — 0 ítems asignados');
            expect(labels).toContain('Europa — 0 ítems asignados');
            expect(labels).toContain('Asia — 0 ítems asignados');
            expect(labels).toContain('África — 0 ítems asignados');
        });

        it('muestra contador con formato "{pendientes} / {total}"', () => {
            view.render(mockItems, mockZones, {});
            const counter = container.querySelector('.oc-counter');
            expect(counter.textContent).toBe('4 / 4');
        });

        it('botón "Verificar respuestas" está deshabilitado inicialmente', () => {
            view.render(mockItems, mockZones, {});
            const btn = container.querySelector('.oc-verify-btn');
            expect(btn.disabled).toBe(true);
            expect(btn.textContent).toBe('Verificar respuestas');
        });

        it('no muestra timer cuando timerEnabled es false', () => {
            view.render(mockItems, mockZones, { timerEnabled: false });
            expect(container.querySelector('.oc-timer')).toBeNull();
        });

        it('muestra timer cuando timerEnabled es true', () => {
            view.render(mockItems, mockZones, { timerEnabled: true, timeLimit: 120 });
            const timer = container.querySelector('.oc-timer');
            expect(timer).not.toBeNull();
            expect(timer.getAttribute('role')).toBe('progressbar');
        });

        it('renderiza ítems tipo flag con imagen', () => {
            view.render(mockItems, mockZones, {});
            const flagItems = container.querySelectorAll('.oc-item__flag');
            expect(flagItems.length).toBe(2);
        });

        it('renderiza ítems tipo capital con texto', () => {
            view.render(mockItems, mockZones, {});
            const labelItems = container.querySelectorAll('.oc-item__label');
            expect(labelItems.length).toBe(2);
            const texts = Array.from(labelItems).map(l => l.textContent);
            expect(texts).toContain('Tokio');
            expect(texts).toContain('Abuya');
        });

        it('ítems son draggable', () => {
            view.render(mockItems, mockZones, {});
            const items = container.querySelectorAll('.oc-item');
            items.forEach(item => {
                expect(item.getAttribute('draggable')).toBe('true');
            });
        });

        it('ítems tienen tabindex para navegación por teclado', () => {
            view.render(mockItems, mockZones, {});
            const items = container.querySelectorAll('.oc-item');
            items.forEach(item => {
                expect(item.getAttribute('tabindex')).toBe('0');
            });
        });
    });

    describe('aria-live regions', () => {
        it('incluye región aria-live="polite"', () => {
            view.render(mockItems, mockZones, {});
            const polite = container.querySelector('[aria-live="polite"]');
            expect(polite).not.toBeNull();
        });

        it('incluye región aria-live="assertive"', () => {
            view.render(mockItems, mockZones, {});
            const assertive = container.querySelector('[aria-live="assertive"]');
            expect(assertive).not.toBeNull();
        });
    });

    describe('updateCounter()', () => {
        it('actualiza el texto del contador', () => {
            view.render(mockItems, mockZones, {});
            view.updateCounter(2, 4);
            const counter = container.querySelector('.oc-counter');
            expect(counter.textContent).toBe('2 / 4');
        });

        it('actualiza aria-label del contador', () => {
            view.render(mockItems, mockZones, {});
            view.updateCounter(1, 4);
            const counter = container.querySelector('.oc-counter');
            expect(counter.getAttribute('aria-label')).toBe('Ítems pendientes: 1 de 4');
        });
    });

    describe('setVerifyEnabled()', () => {
        it('habilita el botón cuando enabled=true', () => {
            view.render(mockItems, mockZones, {});
            view.setVerifyEnabled(true);
            expect(container.querySelector('.oc-verify-btn').disabled).toBe(false);
        });

        it('deshabilita el botón cuando enabled=false', () => {
            view.render(mockItems, mockZones, {});
            view.setVerifyEnabled(true);
            view.setVerifyEnabled(false);
            expect(container.querySelector('.oc-verify-btn').disabled).toBe(true);
        });
    });

    describe('updateTimer()', () => {
        it('actualiza el ancho de la barra de progreso', () => {
            view.render(mockItems, mockZones, { timerEnabled: true, timeLimit: 120 });
            view.updateTimer(60, 120);
            const fill = container.querySelector('.oc-timer__fill');
            expect(fill.style.width).toBe('50%');
        });

        it('actualiza aria-valuenow', () => {
            view.render(mockItems, mockZones, { timerEnabled: true, timeLimit: 120 });
            view.updateTimer(30, 120);
            const timer = container.querySelector('.oc-timer');
            expect(timer.getAttribute('aria-valuenow')).toBe('25');
        });
    });

    describe('updateItemState()', () => {
        it('agrega clase selected al ítem', () => {
            view.render(mockItems, mockZones, {});
            view.updateItemState('item-1', { selected: true });
            const el = container.querySelector('[data-item-id="item-1"]');
            expect(el.classList.contains('oc-item--selected')).toBe(true);
        });

        it('agrega clase correct al ítem', () => {
            view.render(mockItems, mockZones, {});
            view.updateItemState('item-2', { correct: true });
            const el = container.querySelector('[data-item-id="item-2"]');
            expect(el.classList.contains('oc-item--correct')).toBe(true);
        });

        it('agrega clase incorrect al ítem', () => {
            view.render(mockItems, mockZones, {});
            view.updateItemState('item-3', { incorrect: true });
            const el = container.querySelector('[data-item-id="item-3"]');
            expect(el.classList.contains('oc-item--incorrect')).toBe(true);
        });
    });

    describe('destroy()', () => {
        it('remueve el wrapper del DOM', () => {
            view.render(mockItems, mockZones, {});
            expect(container.querySelector('.oc-wrapper')).not.toBeNull();
            view.destroy();
            expect(container.querySelector('.oc-wrapper')).toBeNull();
        });

        it('remueve el stylesheet inyectado', () => {
            view.render(mockItems, mockZones, {});
            expect(document.getElementById('oc-view-styles')).not.toBeNull();
            view.destroy();
            expect(document.getElementById('oc-view-styles')).toBeNull();
        });
    });

    describe('responsive grid (CSS classes)', () => {
        it('panel tiene clase oc-panel para grid layout', () => {
            view.render(mockItems, mockZones, {});
            const panel = container.querySelector('.oc-panel');
            expect(panel.classList.contains('oc-panel')).toBe(true);
        });
    });

    describe('onVerify callback', () => {
        it('invoca onVerify al hacer click en el botón', () => {
            view.render(mockItems, mockZones, {});
            let called = false;
            view.onVerify = () => { called = true; };
            view.setVerifyEnabled(true);
            container.querySelector('.oc-verify-btn').click();
            expect(called).toBe(true);
        });
    });

    describe('moveItemToZone()', () => {
        it('mueve el ítem del panel a la zona indicada', () => {
            view.render(mockItems, mockZones, {});
            view.moveItemToZone('item-1', 'zone-america');

            const zoneItems = container.querySelector('[data-zone-id="zone-america"] .oc-zone__items');
            const itemInZone = zoneItems.querySelector('[data-item-id="item-1"]');
            expect(itemInZone).not.toBeNull();

            // Ya no está en el panel
            const panel = container.querySelector('.oc-panel');
            const itemInPanel = panel.querySelector('[data-item-id="item-1"]');
            expect(itemInPanel).toBeNull();
        });

        it('actualiza aria-label de la zona con el conteo correcto', () => {
            view.render(mockItems, mockZones, {});
            view.moveItemToZone('item-1', 'zone-america');

            const zone = container.querySelector('[data-zone-id="zone-america"]');
            expect(zone.getAttribute('aria-label')).toBe('América — 1 ítem asignado');
        });

        it('actualiza aria-label con plural para múltiples ítems', () => {
            view.render(mockItems, mockZones, {});
            view.moveItemToZone('item-1', 'zone-america');
            view.moveItemToZone('item-2', 'zone-america');

            const zone = container.querySelector('[data-zone-id="zone-america"]');
            expect(zone.getAttribute('aria-label')).toBe('América — 2 ítems asignados');
        });

        it('no hace nada si el ítem no existe', () => {
            view.render(mockItems, mockZones, {});
            // No debería lanzar error
            view.moveItemToZone('item-inexistente', 'zone-america');
            const zoneItems = container.querySelector('[data-zone-id="zone-america"] .oc-zone__items');
            expect(zoneItems.children.length).toBe(0);
        });

        it('no hace nada si la zona no existe', () => {
            view.render(mockItems, mockZones, {});
            view.moveItemToZone('item-1', 'zone-inexistente');
            // El ítem sigue en el panel
            const panel = container.querySelector('.oc-panel');
            expect(panel.querySelector('[data-item-id="item-1"]')).not.toBeNull();
        });
    });

    describe('moveItemToPanel()', () => {
        it('devuelve el ítem de una zona al panel', () => {
            view.render(mockItems, mockZones, {});
            view.moveItemToZone('item-1', 'zone-america');
            view.moveItemToPanel('item-1');

            const panel = container.querySelector('.oc-panel');
            expect(panel.querySelector('[data-item-id="item-1"]')).not.toBeNull();

            const zoneItems = container.querySelector('[data-zone-id="zone-america"] .oc-zone__items');
            expect(zoneItems.querySelector('[data-item-id="item-1"]')).toBeNull();
        });

        it('actualiza aria-label de la zona de origen', () => {
            view.render(mockItems, mockZones, {});
            view.moveItemToZone('item-1', 'zone-america');
            view.moveItemToZone('item-2', 'zone-america');
            view.moveItemToPanel('item-1');

            const zone = container.querySelector('[data-zone-id="zone-america"]');
            expect(zone.getAttribute('aria-label')).toBe('América — 1 ítem asignado');
        });

        it('no hace nada si el ítem no existe', () => {
            view.render(mockItems, mockZones, {});
            // No debería lanzar error
            view.moveItemToPanel('item-inexistente');
        });
    });

    describe('showResults()', () => {
        it('marca ítems correctos con clase oc-item--correct', () => {
            view.render(mockItems, mockZones, {});
            view.moveItemToZone('item-1', 'zone-america');

            view.showResults([
                { itemId: 'item-1', assignedZone: 'zone-america', correctZone: 'America', isCorrect: true }
            ]);

            const el = container.querySelector('[data-item-id="item-1"]');
            expect(el.classList.contains('oc-item--correct')).toBe(true);
        });

        it('marca ítems incorrectos con clase oc-item--incorrect', () => {
            view.render(mockItems, mockZones, {});
            view.moveItemToZone('item-1', 'zone-europe');

            view.showResults([
                { itemId: 'item-1', assignedZone: 'zone-europe', correctZone: 'America', isCorrect: false }
            ]);

            const el = container.querySelector('[data-item-id="item-1"]');
            expect(el.classList.contains('oc-item--incorrect')).toBe(true);
        });

        it('muestra badge con continente correcto para ítems incorrectos', () => {
            view.render(mockItems, mockZones, {});
            view.moveItemToZone('item-1', 'zone-europe');

            view.showResults([
                { itemId: 'item-1', assignedZone: 'zone-europe', correctZone: 'America', isCorrect: false }
            ]);

            const el = container.querySelector('[data-item-id="item-1"]');
            const badge = el.querySelector('.oc-item__correct-zone');
            expect(badge).not.toBeNull();
            expect(badge.textContent).toBe('América');
        });

        it('no muestra badge para ítems correctos', () => {
            view.render(mockItems, mockZones, {});
            view.moveItemToZone('item-1', 'zone-america');

            view.showResults([
                { itemId: 'item-1', assignedZone: 'zone-america', correctZone: 'America', isCorrect: true }
            ]);

            const el = container.querySelector('[data-item-id="item-1"]');
            const badge = el.querySelector('.oc-item__correct-zone');
            expect(badge).toBeNull();
        });

        it('no hace nada con array vacío', () => {
            view.render(mockItems, mockZones, {});
            // No debería lanzar error
            view.showResults([]);
        });
    });

    describe('showSummary()', () => {
        it('crea sección de resumen con datos correctos', () => {
            view.render(mockItems, mockZones, {});
            view.showSummary({ correct: 3, incorrect: 1, score: 75, timeFormatted: '01:30' });

            const summary = container.querySelector('.oc-summary');
            expect(summary).not.toBeNull();
        });

        it('muestra título "Resultado Final"', () => {
            view.render(mockItems, mockZones, {});
            view.showSummary({ correct: 3, incorrect: 1, score: 75, timeFormatted: '01:30' });

            const title = container.querySelector('.oc-summary__title');
            expect(title.textContent).toBe('Resultado Final');
        });

        it('muestra correctos con formato "✓ N correctos"', () => {
            view.render(mockItems, mockZones, {});
            view.showSummary({ correct: 3, incorrect: 1, score: 75, timeFormatted: '01:30' });

            const correct = container.querySelector('.oc-summary__stat--correct');
            expect(correct.textContent).toBe('✓ 3 correctos');
        });

        it('muestra incorrectos con formato "✗ N incorrectos"', () => {
            view.render(mockItems, mockZones, {});
            view.showSummary({ correct: 3, incorrect: 1, score: 75, timeFormatted: '01:30' });

            const incorrect = container.querySelector('.oc-summary__stat--incorrect');
            expect(incorrect.textContent).toBe('✗ 1 incorrectos');
        });

        it('muestra porcentaje de score', () => {
            view.render(mockItems, mockZones, {});
            view.showSummary({ correct: 3, incorrect: 1, score: 75, timeFormatted: '01:30' });

            const score = container.querySelector('.oc-summary__score');
            expect(score.textContent).toBe('75%');
        });

        it('muestra tiempo formateado', () => {
            view.render(mockItems, mockZones, {});
            view.showSummary({ correct: 3, incorrect: 1, score: 75, timeFormatted: '01:30' });

            const time = container.querySelector('.oc-summary__time');
            expect(time.textContent).toBe('Tiempo: 01:30');
        });
    });

    describe('Keyboard Navigation', () => {
        function pressKey(element, key) {
            const event = new KeyboardEvent('keydown', {
                key,
                bubbles: true,
                cancelable: true,
            });
            element.dispatchEvent(event);
        }

        describe('Enter/Space on items', () => {
            it('Enter selects an item (adds oc-item--selected and aria-pressed)', () => {
                view.render(mockItems, mockZones, {});
                const item = container.querySelector('[data-item-id="item-1"]');
                pressKey(item, 'Enter');

                expect(item.classList.contains('oc-item--selected')).toBe(true);
                expect(item.getAttribute('aria-pressed')).toBe('true');
            });

            it('Space selects an item', () => {
                view.render(mockItems, mockZones, {});
                const item = container.querySelector('[data-item-id="item-2"]');
                pressKey(item, ' ');

                expect(item.classList.contains('oc-item--selected')).toBe(true);
                expect(item.getAttribute('aria-pressed')).toBe('true');
            });

            it('pressing Enter on already-selected item deselects it', () => {
                view.render(mockItems, mockZones, {});
                const item = container.querySelector('[data-item-id="item-1"]');
                pressKey(item, 'Enter');
                pressKey(item, 'Enter');

                expect(item.classList.contains('oc-item--selected')).toBe(false);
                expect(item.getAttribute('aria-pressed')).toBeNull();
            });

            it('selecting a new item deselects the previous one', () => {
                view.render(mockItems, mockZones, {});
                const item1 = container.querySelector('[data-item-id="item-1"]');
                const item2 = container.querySelector('[data-item-id="item-2"]');

                pressKey(item1, 'Enter');
                pressKey(item2, 'Enter');

                expect(item1.classList.contains('oc-item--selected')).toBe(false);
                expect(item1.getAttribute('aria-pressed')).toBeNull();
                expect(item2.classList.contains('oc-item--selected')).toBe(true);
                expect(item2.getAttribute('aria-pressed')).toBe('true');
            });
        });

        describe('Enter/Space on zones (assignment)', () => {
            it('assigns keyboard-selected item to zone on Enter', () => {
                view.render(mockItems, mockZones, {});
                let assignedItem = null;
                let assignedZone = null;
                view.onAssign = (itemId, zoneId) => {
                    assignedItem = itemId;
                    assignedZone = zoneId;
                };

                const item = container.querySelector('[data-item-id="item-1"]');
                const zone = container.querySelector('[data-zone-id="zone-america"]');

                pressKey(item, 'Enter');
                pressKey(zone, 'Enter');

                expect(assignedItem).toBe('item-1');
                expect(assignedZone).toBe('zone-america');
            });

            it('assigns keyboard-selected item to zone on Space', () => {
                view.render(mockItems, mockZones, {});
                let assignedItem = null;
                let assignedZone = null;
                view.onAssign = (itemId, zoneId) => {
                    assignedItem = itemId;
                    assignedZone = zoneId;
                };

                const item = container.querySelector('[data-item-id="item-2"]');
                const zone = container.querySelector('[data-zone-id="zone-europe"]');

                pressKey(item, ' ');
                pressKey(zone, ' ');

                expect(assignedItem).toBe('item-2');
                expect(assignedZone).toBe('zone-europe');
            });

            it('does nothing on zone activation without a selected item', () => {
                view.render(mockItems, mockZones, {});
                let called = false;
                view.onAssign = () => { called = true; };

                const zone = container.querySelector('[data-zone-id="zone-america"]');
                pressKey(zone, 'Enter');

                expect(called).toBe(false);
            });

            it('clears keyboard selection after assignment', () => {
                view.render(mockItems, mockZones, {});
                view.onAssign = () => {};

                const item = container.querySelector('[data-item-id="item-1"]');
                const zone = container.querySelector('[data-zone-id="zone-america"]');

                pressKey(item, 'Enter');
                pressKey(zone, 'Enter');

                expect(item.classList.contains('oc-item--selected')).toBe(false);
                expect(item.getAttribute('aria-pressed')).toBeNull();
            });
        });

        describe('Arrow key navigation between zones', () => {
            it('ArrowDown moves focus to next zone', () => {
                view.render(mockItems, mockZones, {});
                const zones = container.querySelectorAll('.oc-zone');
                zones[0].focus();
                pressKey(zones[0], 'ArrowDown');

                expect(document.activeElement).toBe(zones[1]);
            });

            it('ArrowRight moves focus to next zone', () => {
                view.render(mockItems, mockZones, {});
                const zones = container.querySelectorAll('.oc-zone');
                zones[0].focus();
                pressKey(zones[0], 'ArrowRight');

                expect(document.activeElement).toBe(zones[1]);
            });

            it('ArrowUp moves focus to previous zone', () => {
                view.render(mockItems, mockZones, {});
                const zones = container.querySelectorAll('.oc-zone');
                zones[1].focus();
                pressKey(zones[1], 'ArrowUp');

                expect(document.activeElement).toBe(zones[0]);
            });

            it('ArrowLeft moves focus to previous zone', () => {
                view.render(mockItems, mockZones, {});
                const zones = container.querySelectorAll('.oc-zone');
                zones[2].focus();
                pressKey(zones[2], 'ArrowLeft');

                expect(document.activeElement).toBe(zones[1]);
            });

            it('ArrowDown wraps from last zone to first', () => {
                view.render(mockItems, mockZones, {});
                const zones = container.querySelectorAll('.oc-zone');
                const lastZone = zones[zones.length - 1];
                lastZone.focus();
                pressKey(lastZone, 'ArrowDown');

                expect(document.activeElement).toBe(zones[0]);
            });

            it('ArrowUp wraps from first zone to last', () => {
                view.render(mockItems, mockZones, {});
                const zones = container.querySelectorAll('.oc-zone');
                zones[0].focus();
                pressKey(zones[0], 'ArrowUp');

                expect(document.activeElement).toBe(zones[zones.length - 1]);
            });
        });

        describe('Focus management after assignment', () => {
            it('moves focus to next pending item after assignment', () => {
                view.render(mockItems, mockZones, {});
                // Simulate that item-1 gets moved to zone by the controller callback
                view.onAssign = (itemId, zoneId) => {
                    view.moveItemToZone(itemId, zoneId);
                };

                const item1 = container.querySelector('[data-item-id="item-1"]');
                const zone = container.querySelector('[data-zone-id="zone-america"]');

                pressKey(item1, 'Enter');
                pressKey(zone, 'Enter');

                // Focus should be on the next pending item in the panel
                const nextPending = container.querySelector('.oc-panel .oc-item');
                expect(document.activeElement).toBe(nextPending);
            });

            it('moves focus to verify button when no pending items remain', () => {
                view.render(mockItems, mockZones, {});
                // Move all items to zones first
                view.moveItemToZone('item-1', 'zone-america');
                view.moveItemToZone('item-2', 'zone-europe');
                view.moveItemToZone('item-3', 'zone-asia');

                // Now assign the last item via keyboard
                view.onAssign = (itemId, zoneId) => {
                    view.moveItemToZone(itemId, zoneId);
                    // Controller would enable verify when all items assigned
                    view.setVerifyEnabled(true);
                };

                const item4 = container.querySelector('[data-item-id="item-4"]');
                const zone = container.querySelector('[data-zone-id="zone-africa"]');

                pressKey(item4, 'Enter');
                pressKey(zone, 'Enter');

                // Focus should be on the verify button
                expect(document.activeElement).toBe(view.elements.verifyBtn);
            });
        });

        describe('Keyboard does not interfere with other handlers', () => {
            it('arrow keys on non-zone elements do not trigger zone navigation', () => {
                view.render(mockItems, mockZones, {});
                const item = container.querySelector('[data-item-id="item-1"]');
                item.focus();
                pressKey(item, 'ArrowDown');

                // Focus should remain on the item (no zone navigation)
                expect(document.activeElement).toBe(item);
            });
        });
    });
});
