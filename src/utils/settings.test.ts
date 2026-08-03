import { getSetting, storeSetting } from '@/utils/settings';

describe('settings storage safety', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns null instead of throwing when stored settings are corrupt', () => {
        localStorage.setItem('dbot_settings', '{broken-json');

        expect(() => getSetting('journal_filter')).not.toThrow();
        expect(getSetting('journal_filter')).toBeNull();
    });

    it('recovers from corrupt data when saving a new setting', () => {
        localStorage.setItem('dbot_settings', '{broken-json');

        expect(() => storeSetting('journal_filter', ['error', 'notify', 'success'])).not.toThrow();
        expect(getSetting('journal_filter')).toEqual(['error', 'notify', 'success']);
    });
});
