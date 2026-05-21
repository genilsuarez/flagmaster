/**
 * Country model representing a country entity
 */
export class Country {
    constructor(data) {
        this.continent = data.Continent;
        this.englishName = data.Country_English;
        this.spanishName = data.Country_Spanish;
        this.capital = data.Capital_Spanish || '';
        this.flagUrl = data.Flag_URL;
        this.isSovereign = data.Sovereign_State === 'Yes';
        this.population = data.Population;
        this.area = data.Total_Area_Km2;
    }

    get displayName() {
        return this.spanishName;
    }

    get isValidCountry() {
        return this.englishName && this.flagUrl;
    }
}