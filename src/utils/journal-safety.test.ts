import {
    mergeJournalEntries,
    normalizeJournalFilters,
    normalizeJournalMessage,
    normalizeStoredJournalEntries,
} from '@/utils/journal-safety';

describe('journal safety', () => {
    const valid_filters = ['error', 'notify', 'success'];

    it('converts Error objects and API error objects into renderable text', () => {
        expect(normalizeJournalMessage(new Error('Proposal is not ready'))).toBe('Proposal is not ready');
        expect(normalizeJournalMessage({ message: 'Buy response is missing' })).toBe('Buy response is missing');
    });

    it('restores all filters when saved filter data is empty or corrupt', () => {
        expect(normalizeJournalFilters([], valid_filters)).toEqual(valid_filters);
        expect(normalizeJournalFilters('error', valid_filters)).toEqual(valid_filters);
        expect(normalizeJournalFilters(['error', 'unknown', 'error'], valid_filters)).toEqual(['error']);
    });

    it('repairs cached entries that are missing UI fields', () => {
        expect(
            normalizeStoredJournalEntries(
                [{ message: { message: 'Recovered error' }, message_type: 'error' }],
                valid_filters,
                'notify',
                () => 'generated-id'
            )
        ).toEqual([
            {
                className: '',
                extra: {},
                message: 'Recovered error',
                message_type: 'error',
                unique_id: 'generated-id',
            },
        ]);
    });

    it('drops non-object cache entries without throwing', () => {
        expect(normalizeStoredJournalEntries([null, 'broken'], valid_filters, 'notify', () => 'id')).toEqual([]);
    });

    it('preserves live entries when cached journals are restored for the same account', () => {
        const live_entry = {
            className: 'journal__text--analysis',
            date: '2026-07-02',
            extra: {},
            message: 'Contract opened: 12345',
            message_type: 'notify',
            time: '12:00:00 GMT',
            unique_id: 'live-1',
        };
        const cached_entry = {
            className: '',
            date: '2026-07-01',
            extra: {},
            message: 'Welcome back! Your messages have been restored.',
            message_type: 'success',
            time: '09:00:00 GMT',
            unique_id: 'cached-1',
        };

        expect(mergeJournalEntries([live_entry], [cached_entry])).toEqual([live_entry, cached_entry]);
    });

    it('deduplicates journal entries when live and cached data overlap', () => {
        const shared_entry = {
            className: '',
            date: '2026-07-02',
            extra: {},
            message: 'Contract settled: 67890',
            message_type: 'notify',
            time: '12:01:00 GMT',
            unique_id: 'shared-1',
        };

        expect(mergeJournalEntries([shared_entry], [shared_entry])).toEqual([shared_entry]);
    });
});
