import { isDomainFeatureEnabled } from '@/components/shared';

export const getPrintBlockCode = (message_code: string) => {
    if (!isDomainFeatureEnabled('printPopups')) {
        return '';
    }

    return `window.alert(${message_code});\n`;
};
