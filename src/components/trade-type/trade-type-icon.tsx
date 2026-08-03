import { lazy, Suspense } from 'react';
import { isHighLow } from '@/components/shared';
import { IconSize } from '@/components/shared_ui/figma-icons';

const TRADE_TYPE_ICONS = {
    ACCU: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesAccumulatorStayInIcon,
        }))
    ),
    ACCUMULATOR: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesAccumulatorStayInIcon,
        }))
    ),
    ACCUBREAK: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesAccumulatorBreakOutIcon,
        }))
    ),
    DIGITDIFF: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesDigitsDiffersIcon,
        }))
    ),
    DIGITEVEN: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesDigitsEvenIcon,
        }))
    ),
    DIGITMATCH: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesDigitsMatchesIcon,
        }))
    ),
    DIGITODD: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesDigitsOddIcon,
        }))
    ),
    DIGITOVER: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesDigitsOverIcon,
        }))
    ),
    DIGITUNDER: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesDigitsUnderIcon,
        }))
    ),
    TICKHIGH: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesHighsAndLowsHighIcon,
        }))
    ),
    TICKLOW: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesHighsAndLowsLowIcon,
        }))
    ),
    NOTOUCH: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesHighsAndLowsNoTouchIcon,
        }))
    ),
    ONETOUCH: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesHighsAndLowsTouchIcon,
        }))
    ),
    EXPIRYRANGE: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesInsAndOutsEndsInIcon,
        }))
    ),
    EXPIRYMISS: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesInsAndOutsEndsOutIcon,
        }))
    ),
    UPORDOWN: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesInsAndOutsGoesOutIcon,
        }))
    ),
    RANGE: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesInsAndOutsStaysInIcon,
        }))
    ),
    MULTDOWN: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesMultipliersDownIcon,
        }))
    ),
    MULTUP: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesMultipliersUpIcon,
        }))
    ),
    CALLSPREAD: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesSpreadsCallIcon,
        }))
    ),
    PUTSPREAD: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesSpreadsPutIcon,
        }))
    ),
    LBFLOATCALL: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesLookbacksCloseLowIcon,
        }))
    ),
    LBFLOATPUT: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesLookbacksHighCloseIcon,
        }))
    ),
    LBHIGHLOW: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesLookbacksHighLowIcon,
        }))
    ),
    TURBOSLONG: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesTurboLongIcon,
        }))
    ),
    TURBOSSHORT: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesTurboShortIcon,
        }))
    ),
    VANILLALONGCALL: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesVanillaCallIcon,
        }))
    ),
    VANILLALONGPUT: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesVanillaPutIcon,
        }))
    ),
    ASIAND: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesUpsAndDownsAsianDownIcon,
        }))
    ),
    ASIANU: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesUpsAndDownsAsianUpIcon,
        }))
    ),
    PUT: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesUpsAndDownsFallIcon,
        }))
    ),
    PUTE: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesUpsAndDownsFallIcon,
        }))
    ),
    RUNLOW: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesUpsAndDownsOnlyDownsIcon,
        }))
    ),
    RUNHIGH: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesUpsAndDownsOnlyUpsIcon,
        }))
    ),
    RESETPUT: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesUpsAndDownsResetDownIcon,
        }))
    ),
    RESETCALL: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesUpsAndDownsResetUpIcon,
        }))
    ),
    CALL: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesUpsAndDownsRiseIcon,
        }))
    ),
    CALLE: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesUpsAndDownsRiseIcon,
        }))
    ),
    HIGHER: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesHighsAndLowsHigherIcon,
        }))
    ),
    LOWER: lazy(() =>
        import('@/components/shared_ui/figma-icons/TradeTypes').then(module => ({
            default: module.TradeTypesHighsAndLowsLowerIcon,
        }))
    ),
    unknown: lazy(() =>
        import('@/components/shared_ui/figma-icons/Illustrative').then(module => ({
            default: module.IllustrativeMarketsIcon,
        }))
    ),
};

export const getTradeTypeIconType = (contract?: { contract_type?: string; shortcode?: string } | null) => {
    const contract_type = contract?.contract_type?.toUpperCase() || '';
    const is_high_low = isHighLow({ shortcode: contract?.shortcode || '' });

    if (is_high_low && contract_type === 'CALL') return 'HIGHER';
    if (is_high_low && contract_type === 'PUT') return 'LOWER';

    return contract_type;
};

export const TradeTypeIcon = ({ type, size, className }: { type: string; size?: IconSize; className?: string }) => {
    const Icon = TRADE_TYPE_ICONS[type?.toUpperCase() as keyof typeof TRADE_TYPE_ICONS] || TRADE_TYPE_ICONS.unknown;

    return (
        <Suspense fallback={null}>
            <Icon iconSize={size ?? 'xs'} className={className} />
        </Suspense>
    );
};
