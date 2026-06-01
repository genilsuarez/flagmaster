import { Country } from '../models/Country.js';

/**
 * Service for managing country data operations
 */
export class CountryService {
    constructor() {
        this.countries = [];
    }

    async loadCountries() {
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