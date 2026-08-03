jest.mock('@/components/shared', () => ({
    isDomainFeatureEnabled: jest.fn(),
}));

import { isDomainFeatureEnabled } from '@/components/shared';
import { getPrintBlockCode } from '../text-print-utils';

const mockedIsDomainFeatureEnabled = isDomainFeatureEnabled as jest.MockedFunction<typeof isDomainFeatureEnabled>;

describe('getPrintBlockCode', () => {
    it('returns an alert call when print popups are enabled', () => {
        mockedIsDomainFeatureEnabled.mockReturnValue(true);

        expect(getPrintBlockCode("'Hello'")).toBe("window.alert('Hello');\n");
    });

    it('returns no code when print popups are disabled for the domain', () => {
        mockedIsDomainFeatureEnabled.mockReturnValue(false);

        expect(getPrintBlockCode("'Hello'")).toBe('');
    });
});
