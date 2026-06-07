import { Country } from '../models/Country.js';

/**
 * Service for managing country data operations
 */
export class CountryService {
    constructor() {
        this.countries = [];
        /** @type {Promise<Country[]>|null} Resolves when country data is loaded */
        this._loadingPromise = null;
    }

    async loadCountries() {
        if (this._loadingPromise) return this._loadingPromise;

        this._loadingPromise = this._fetchCountries();
        return this._loadingPromise;
    }

    /**
     * Returns a promise that resolves when countries are loaded.
     * If already loaded, resolves immediately.
     * If no load has been initiated, triggers one automatically.
     * @returns {Promise<void>}
     */
    async ready() {
        if (this.countries.length > 0) return;
        if (!this._loadingPromise) {
            this._loadingPromise = this._fetchCountries();
        }
        await this._loadingPromise;
    }

    /** @private */
    async _fetchCountries() {
        try {
            const response = await fetch(`${import.meta.env.BASE_URL}assets/data/flags.json`);
            const data = await response.json();
            this.countries = data.map(countryData => {
                const country = new Country(countryData);
                country.capital = countryData.Capital_Spanish || 'Desconocida';
                return country;
            });
            return this.countries;
        } catch (error) {
            console.error('Error loading countries:', error);
            throw new Error('Failed to load country data');
        }
    }

    filterCountries(filters = {}) {
        const hasContinentFilter = filters.continent && filters.continent !== 'All';
        const hasSovereigntyFilter = filters.sovereigntyStatus && filters.sovereigntyStatus !== 'All';

        let filtered;
        if (hasContinentFilter || hasSovereigntyFilter) {
            const isSovereign = filters.sovereigntyStatus === 'Yes';
            filtered = this.countries.filter(country => {
                if (hasContinentFilter && country.continent !== filters.continent) return false;
                if (hasSovereigntyFilter && country.isSovereign !== isSovereign) return false;
                return true;
            });
        } else {
            filtered = this.countries.slice();
        }

        if (filters.maxCount && filters.maxCount > 0 && filters.maxCount < filtered.length) {
            filtered = filtered.slice(0, filters.maxCount);
        }

        return filtered;
    }

    getAvailableContinents() {
        const continents = new Set(this.countries.map(country => country.continent));
        // If no countries loaded yet, return known continents as fallback
        if (continents.size === 0) {
            return ['All', 'Africa', 'America', 'Asia', 'Europe', 'Oceania'];
        }
        return ['All', ...Array.from(continents).sort()];
    }

    getCountryCount(filters = {}) {
        return this.filterCountries(filters).length;
    }

    getMaxCountryCount(filters = {}) {
        const hasContinentFilter = filters.continent && filters.continent !== 'All';
        const hasSovereigntyFilter = filters.sovereigntyStatus && filters.sovereigntyStatus !== 'All';

        if (!hasContinentFilter && !hasSovereigntyFilter) {
            return this.countries.length;
        }

        const isSovereign = filters.sovereigntyStatus === 'Yes';
        let count = 0;
        for (let i = 0, len = this.countries.length; i < len; i++) {
            const country = this.countries[i];
            if (hasContinentFilter && country.continent !== filters.continent) continue;
            if (hasSovereigntyFilter && country.isSovereign !== isSovereign) continue;
            count++;
        }
        return count;
    }
}