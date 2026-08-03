jest.mock('@/external/bot-skeleton', () => ({
    MessageTypes: {
        ERROR: 'error',
        NOTIFY: 'notify',
        SUCCESS: 'success',
    },
}));

jest.mock('@/external/bot-skeleton/utils/workspace', () => ({
    isDbotRTL: jest.fn(() => false),
}));

jest.mock('@/hooks/useStore', () => ({
    useStore: jest.fn(() => ({
        ui: { is_dark_mode_on: false },
    })),
}));

jest.mock('@deriv-com/translations', () => ({
    localize: jest.fn((text: string) => text),
}));

import { render, screen } from '@testing-library/react';
import { TFilterMessageValues } from '../journal.types';
import JournalItem from './journal-item';

describe('JournalItem', () => {
    it('renders an Error object as readable text without crashing the journal', () => {
        render(
            <JournalItem
                is_new_row={false}
                measure={jest.fn()}
                row={
                    {
                        className: '',
                        date: '2026-07-01',
                        extra: {},
                        message: new Error('Proposal data is still loading'),
                        message_type: 'error',
                        time: '15:10:56 GMT',
                        unique_id: 'journal-error-1',
                    } as unknown as TFilterMessageValues
                }
            />
        );

        expect(screen.getByText('Proposal data is still loading')).toBeInTheDocument();
    });
});
