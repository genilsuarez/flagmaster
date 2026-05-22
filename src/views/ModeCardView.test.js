import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModeCardView } from './ModeCardView.js';

describe('ModeCardView', () => {
    let container;
    let onSelect;

    const teamMode = {
        id: 'banderaFlash',
        name: 'Bandera Flash',
        icon: '🏴',
        category: 'team',
        description: 'Adivina el país por su bandera',
    };

    const individualMode = {
        id: 'flagRush',
        name: 'Flag Rush',
        icon: '🚩',
        category: 'individual',
        description: 'Elige el país correcto a contrarreloj',
    };

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        onSelect = vi.fn();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('renders an article element with role="button"', () => {
        const view = new ModeCardView({ mode: teamMode, onSelect });
        const el = view.render();
        expect(el.tagName).toBe('ARTICLE');
        expect(el.getAttribute('role')).toBe('button');
    });

    it('sets tabindex="0" for keyboard focusability', () => {
        const view = new ModeCardView({ mode: teamMode, onSelect });
        const el = view.render();
        expect(el.getAttribute('tabindex')).toBe('0');
    });

    it('sets aria-label in format "{name} — {category}: {description}"', () => {
        const view = new ModeCardView({ mode: teamMode, onSelect });
        const el = view.render();
        expect(el.getAttribute('aria-label')).toBe('Bandera Flash — Equipos: Adivina el país por su bandera');
    });

    it('uses "Individual" label for individual category modes', () => {
        const view = new ModeCardView({ mode: individualMode, onSelect });
        const el = view.render();
        expect(el.getAttribute('aria-label')).toBe('Flag Rush — Individual: Elige el país correcto a contrarreloj');
    });

    it('renders emoji icon with aria-hidden="true"', () => {
        const view = new ModeCardView({ mode: teamMode, onSelect });
        const el = view.render();
        const icon = el.querySelector('.mode-card__icon');
        expect(icon).not.toBeNull();
        expect(icon.textContent).toBe('🏴');
        expect(icon.getAttribute('aria-hidden')).toBe('true');
    });

    it('renders mode name in an h3 element', () => {
        const view = new ModeCardView({ mode: teamMode, onSelect });
        const el = view.render();
        const name = el.querySelector('h3.mode-card__name');
        expect(name).not.toBeNull();
        expect(name.textContent).toBe('Bandera Flash');
    });

    it('renders description in a p element', () => {
        const view = new ModeCardView({ mode: teamMode, onSelect });
        const el = view.render();
        const desc = el.querySelector('p.mode-card__description');
        expect(desc).not.toBeNull();
        expect(desc.textContent).toBe('Adivina el país por su bandera');
    });

    it('renders category badge with correct class for team modes', () => {
        const view = new ModeCardView({ mode: teamMode, onSelect });
        const el = view.render();
        const badge = el.querySelector('.mode-card__badge');
        expect(badge).not.toBeNull();
        expect(badge.classList.contains('mode-card__badge--team')).toBe(true);
        expect(badge.textContent).toBe('Equipos');
    });

    it('renders category badge with correct class for individual modes', () => {
        const view = new ModeCardView({ mode: individualMode, onSelect });
        const el = view.render();
        const badge = el.querySelector('.mode-card__badge');
        expect(badge.classList.contains('mode-card__badge--individual')).toBe(true);
        expect(badge.textContent).toBe('Individual');
    });

    it('calls onSelect with mode id on click', () => {
        const view = new ModeCardView({ mode: teamMode, onSelect });
        const el = view.render();
        container.appendChild(el);
        el.click();
        expect(onSelect).toHaveBeenCalledWith('banderaFlash');
    });

    it('calls onSelect with mode id on Enter key', () => {
        const view = new ModeCardView({ mode: individualMode, onSelect });
        const el = view.render();
        container.appendChild(el);
        const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        el.dispatchEvent(event);
        expect(onSelect).toHaveBeenCalledWith('flagRush');
    });

    it('calls onSelect with mode id on Space key', () => {
        const view = new ModeCardView({ mode: individualMode, onSelect });
        const el = view.render();
        container.appendChild(el);
        const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
        el.dispatchEvent(event);
        expect(onSelect).toHaveBeenCalledWith('flagRush');
    });

    it('does not call onSelect on other keys', () => {
        const view = new ModeCardView({ mode: teamMode, onSelect });
        const el = view.render();
        container.appendChild(el);
        const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
        el.dispatchEvent(event);
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('sets data-mode-id attribute', () => {
        const view = new ModeCardView({ mode: teamMode, onSelect });
        const el = view.render();
        expect(el.getAttribute('data-mode-id')).toBe('banderaFlash');
    });

    it('stores the rendered element on the instance', () => {
        const view = new ModeCardView({ mode: teamMode, onSelect });
        expect(view.element).toBeNull();
        const el = view.render();
        expect(view.element).toBe(el);
    });
});
