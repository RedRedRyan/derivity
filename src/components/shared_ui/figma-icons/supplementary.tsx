import { createBadgeIcon, createFillIcon, createStrokeIcon } from './icon-base';

export const StandaloneBullhornRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path d='M5 12h3l7-4v8l-7-4H5z' stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin='round' />
        <path d='M8 14v3a1.5 1.5 0 001.5 1.5H10' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
    </>
));

export const StandaloneFlagCheckeredFillIcon = createFillIcon(fill => (
    <>
        <path d='M7 4.5v15' stroke={fill} strokeWidth='1.8' strokeLinecap='round' />
        <path d='M8 6h8l-1.8 2L16 10H8z' fill={fill} opacity='0.18' />
        <path d='M8 6h8l-1.8 2L16 10H8z' stroke={fill} strokeWidth='1.5' strokeLinejoin='round' fill='none' />
    </>
));

export const StandaloneSortDownFillIcon = createFillIcon(fill => <path d='M12 16l-5-6h10l-5 6z' fill={fill} />);
export const StandaloneSortUpFillIcon = createFillIcon(fill => <path d='M12 8l5 6H7l5-6z' fill={fill} />);

export const LegacyEdit1pxIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path
            d='M5 19l3.5-.7L17 9.8 14.2 7 5.7 15.5 5 19z'
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin='round'
        />
        <path d='M12.8 8.4L15.6 11.2' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
    </>
));

export const LegacyHandleLessIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path
            d='M7 10l5 5 5-5'
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </>
));

export const LegacyRadioOffIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <circle cx='12' cy='12' r='7.5' stroke={stroke} strokeWidth={strokeWidth} />
));

export const LegacyRadioOnIcon = createFillIcon(fill => (
    <>
        <circle cx='12' cy='12' r='7.5' stroke={fill} strokeWidth='1.5' fill='none' />
        <circle cx='12' cy='12' r='3' fill={fill} />
    </>
));

export const LegacyTimeIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <circle cx='12' cy='12' r='8.5' stroke={stroke} strokeWidth={strokeWidth} />
        <path
            d='M12 8v4l2.8 2'
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </>
));

export const AccountsDerivAccountLightIcon = createBadgeIcon({
    label: 'ACC',
    accent: '#ea580c',
    background: '#fff7ed',
});

export const DerivLightEmptyCardboardBoxIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path
            d='M6 8.5L12 5l6 3.5v7L12 19l-6-3.5v-7z'
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin='round'
        />
        <path d='M6 8.5l6 3.5 6-3.5M12 12v7' stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin='round' />
    </>
));

export const LabelPairedChevronsRightCaptionRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path
            d='M8 7l4 5-4 5M12 7l4 5-4 5'
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </>
));

export const LabelPairedGlobeSmRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <circle cx='12' cy='12' r='8.5' stroke={stroke} strokeWidth={strokeWidth} />
        <path
            d='M3.8 12h16.4M12 3.8a12 12 0 010 16.4M12 3.8a12 12 0 000 16.4'
            stroke={stroke}
            strokeWidth={1.4}
            strokeLinecap='round'
        />
    </>
));
