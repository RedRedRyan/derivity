export type TLanguageOption = {
    code: string;
    displayName: string;
    icon: null;
};

export const LANGUAGES: TLanguageOption[] = [
    { code: 'EN', displayName: 'English', icon: null },
    { code: 'AR', displayName: 'Arabic', icon: null },
    { code: 'BN', displayName: 'Bengali', icon: null },
    { code: 'DE', displayName: 'Deutsch', icon: null },
    { code: 'ES', displayName: 'Espanol', icon: null },
    { code: 'FR', displayName: 'Francais', icon: null },
    { code: 'IT', displayName: 'Italiano', icon: null },
    { code: 'SW', displayName: 'Kiswahili', icon: null },
    { code: 'KM', displayName: 'Khmer', icon: null },
    { code: 'KO', displayName: 'Korean', icon: null },
    { code: 'MN', displayName: 'Mongolian', icon: null },
    { code: 'PL', displayName: 'Polski', icon: null },
    { code: 'PT', displayName: 'Portugues', icon: null },
    { code: 'RU', displayName: 'Russian', icon: null },
    { code: 'SI', displayName: 'Sinhala', icon: null },
    { code: 'TA', displayName: 'Tamil', icon: null },
    { code: 'TR', displayName: 'Turkish', icon: null },
    { code: 'VI', displayName: 'Vietnamese', icon: null },
    { code: 'ZH_CN', displayName: 'Chinese Simplified', icon: null },
    { code: 'ZH_TW', displayName: 'Chinese Traditional', icon: null },
];

export const FILTERED_LANGUAGES = LANGUAGES.filter(lang =>
    ['EN', 'ES', 'FR', 'PT', 'AR', 'IT', 'RU', 'VI', 'ZH_CN', 'ZH_TW', 'DE', 'BN', 'SW', 'KO', 'PL', 'SI', 'TA', 'MN'].includes(
        lang.code
    )
);
