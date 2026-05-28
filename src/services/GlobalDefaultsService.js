/**
 * GlobalDefaultsService — Single source of truth for shared game defaults.
 *
 * Governs the four fields that are common to every game mode and that the
 * user may want to set once rather than repeating per mode:
 *
 *   continent        — country pool filter  ('All' | 'Africa' | 'America' | 'Asia' | 'Europe' | 'Oceania')
 *   sovereigntyStatus — country pool filter  ('All' | 'Yes' | 'No')
 *   maxCount         — max countries to use  (number | null → use all)
 *   randomOrder      — shuffle pool          (boolean, default true)
 *
 * These values are persisted under a single localStorage key and are read by
 * BottomSheetView as the starting point before per-mode overrides are applied.
 *
 * Per-mode overrides (modeOptions: rounds, timePerQuestion, etc.) are NOT
 * managed here — they remain in `flagquiz_mode_config_<modeId>`.
 *
 * Usage:
 *   const svc = new GlobalDefaultsService();
 *   svc.get()          // → { continent, sovereigntyStatus, maxCount, randomOrder }
 *   svc.set({ ... })   // persists and notifies listeners
 *   svc.onChange(fn)   // subscribe to changes
 */
export class GlobalDefaultsService {
    static STORAGE_KEY = 'flagquiz_global_defaults';

    static FACTORY_DEFAULTS = {
        continent: 'All',
        sovereigntyStatus: 'All',
        maxCount: null,
        randomOrder: true,
    };

    constructor() {
        this._defaults = this._load();
        this._listeners = [];
    }

    /**
     * Returns a copy of the current global defaults.
     * @returns {{ continent: string, sovereigntyStatus: string, maxCount: number|null, randomOrder: boolean }}
     */
    get() {
        return { ...this._defaults };
    }

    /**
     * Merges the given partial object into the current defaults,
     * persists to localStorage, and notifies all listeners.
     * @param {Partial<{continent: string, sovereigntyStatus: string, maxCount: number|null, randomOrder: boolean}>} partial
     */
    set(partial) {
        const prev = { ...this._defaults };

        if (partial.continent !== undefined)        this._defaults.continent        = partial.continent;
        if (partial.sovereigntyStatus !== undefined) this._defaults.sovereigntyStatus = partial.sovereigntyStatus;
        if (partial.maxCount !== undefined)          this._defaults.maxCount          = partial.maxCount;
        if (partial.randomOrder !== undefined)       this._defaults.randomOrder       = partial.randomOrder;

        this._save();
        this._notify(this._defaults, prev);
    }

    /**
     * Registers a listener called whenever defaults change.
     * @param {function(current: object, prev: object): void} fn
     * @returns {function} unsubscribe function
     */
    onChange(fn) {
        this._listeners.push(fn);
        return () => {
            this._listeners = this._listeners.filter(l => l !== fn);
        };
    }

    // ─── Private ────────────────────────────────────────────────────────────

    _load() {
        try {
            const raw = localStorage.getItem(GlobalDefaultsService.STORAGE_KEY);
            if (!raw) return { ...GlobalDefaultsService.FACTORY_DEFAULTS };

            const parsed = JSON.parse(raw);
            const fd = GlobalDefaultsService.FACTORY_DEFAULTS;

            return {
                continent:        this._validContinent(parsed.continent)        ?? fd.continent,
                sovereigntyStatus: this._validSovereignty(parsed.sovereigntyStatus) ?? fd.sovereigntyStatus,
                maxCount:         this._validMaxCount(parsed.maxCount)          ?? fd.maxCount,
                randomOrder:      typeof parsed.randomOrder === 'boolean'       ? parsed.randomOrder : fd.randomOrder,
            };
        } catch {
            return { ...GlobalDefaultsService.FACTORY_DEFAULTS };
        }
    }

    _save() {
        try {
            localStorage.setItem(
                GlobalDefaultsService.STORAGE_KEY,
                JSON.stringify(this._defaults)
            );
        } catch { /* quota exceeded */ }
    }

    _notify(current, prev) {
        for (const fn of this._listeners) {
            try { fn(current, prev); } catch { /* ignore listener errors */ }
        }
    }

    _validContinent(v) {
        const valid = ['All', 'Africa', 'America', 'Asia', 'Europe', 'Oceania'];
        return valid.includes(v) ? v : null;
    }

    _validSovereignty(v) {
        return ['All', 'Yes', 'No'].includes(v) ? v : null;
    }

    _validMaxCount(v) {
        if (v === null || v === undefined) return null;
        const n = Number(v);
        return Number.isFinite(n) && n >= 5 ? n : null;
    }
}
