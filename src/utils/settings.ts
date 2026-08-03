const getSettingsFromLocal = () => {
    try {
        const stored_settings = localStorage.getItem('dbot_settings');
        if (!stored_settings) return null;

        const parsed_settings = JSON.parse(stored_settings);
        return parsed_settings && typeof parsed_settings === 'object' && !Array.isArray(parsed_settings)
            ? parsed_settings
            : null;
    } catch {
        return null;
    }
};

export const getSetting = (key: string) => {
    const settings = getSettingsFromLocal();
    if (!settings) return null;
    return settings[key];
};

export const storeSetting = (key: string, value: unknown) => {
    const settings = getSettingsFromLocal() || {};
    settings[key] = value;
    localStorage.setItem('dbot_settings', JSON.stringify(settings));
};

export const removeKeyValue = (key: string) => {
    const settings = getSettingsFromLocal() || {};
    delete settings[key];

    localStorage.setItem('dbot_settings', JSON.stringify(settings));
};
