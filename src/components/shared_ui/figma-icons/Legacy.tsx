import { createFillIcon, createStrokeIcon } from './icon-base';

export const LegacyMenuHamburger1pxIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path d='M4 7h16M4 12h16M4 17h16' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
    </>
));

export const LegacyClose1pxIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path d='M6 6l12 12M18 6L6 18' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
    </>
));

export const LegacyCloseCircle1pxBlackIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <circle cx='12' cy='12' r='8.5' stroke={stroke} strokeWidth={strokeWidth} />
        <path d='M9 9l6 6M15 9l-6 6' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
    </>
));

export const LegacyChevronLeft1pxIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <path
        d='M14.5 6.5L9 12l5.5 5.5'
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeLinejoin='round'
    />
));

export const LegacyChevronRight1pxIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <path
        d='M9.5 6.5L15 12l-5.5 5.5'
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeLinejoin='round'
    />
));

export const LegacyFullscreen1pxIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path
            d='M8 4H4v4M16 4h4v4M8 20H4v-4M20 20h-4v-4'
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap='round'
        />
    </>
));

export const LegacyHomeNewIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path
            d='M4.5 11.5L12 5l7.5 6.5'
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M7 10.5V19h10v-8.5'
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </>
));

export const LegacyInfo1pxIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <circle cx='12' cy='12' r='8.5' stroke={stroke} strokeWidth={strokeWidth} />
        <path d='M12 10.5V16' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
        <circle cx='12' cy='8' r='1' fill={stroke} />
    </>
));

export const LegacyLogout1pxIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path
            d='M10 6H6.5A1.5 1.5 0 005 7.5v9A1.5 1.5 0 006.5 18H10'
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap='round'
        />
        <path
            d='M13 8l4 4-4 4M17 12H9'
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </>
));

export const LegacyMenuDots1pxIcon = createFillIcon(fill => (
    <>
        <circle cx='6.5' cy='12' r='1.5' fill={fill} />
        <circle cx='12' cy='12' r='1.5' fill={fill} />
        <circle cx='17.5' cy='12' r='1.5' fill={fill} />
    </>
));

export const LegacyNotificationIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path
            d='M12 5a4 4 0 00-4 4v2.5L6.5 14v1h11v-1L16 11.5V9a4 4 0 00-4-4z'
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin='round'
        />
        <path d='M10.2 17.5a2 2 0 003.6 0' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
    </>
));

export const LegacyOpenPositionIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <rect x='5' y='6' width='14' height='12' rx='2' stroke={stroke} strokeWidth={strokeWidth} />
        <path d='M8 10h8M8 14h5' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
    </>
));

export const LegacyProfitTableIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path d='M6 17V9M12 17V6M18 17v-4' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
        <path d='M5 18h14' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
    </>
));

export const LegacyReportsIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path d='M7 5h8l3 3v11H7z' stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin='round' />
        <path d='M15 5v3h3M9 12h6M9 15h4' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
    </>
));

export const LegacySave1pxIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path d='M6 5h10l2 2v12H6z' stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin='round' />
        <path d='M9 5v5h6V5M9 18v-5h6v5' stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin='round' />
    </>
));

export const LegacyStatementIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <rect x='6' y='4.5' width='12' height='15' rx='2' stroke={stroke} strokeWidth={strokeWidth} />
        <path d='M9 9h6M9 12h6M9 15h4' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
    </>
));

export const LegacyTheme1pxIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path
            d='M12 4a7.5 7.5 0 100 15 6.5 6.5 0 010-15z'
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </>
));

export const LegacyThemeDarkIcon = LegacyTheme1pxIcon;

export const LegacyThemeLightIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <circle cx='12' cy='12' r='4' stroke={stroke} strokeWidth={strokeWidth} />
        <path
            d='M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6'
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap='round'
        />
    </>
));

export const LegacyWarningIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path d='M12 5l8 14H4L12 5z' stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin='round' />
        <path d='M12 10v4' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
        <circle cx='12' cy='16.5' r='1' fill={stroke} />
    </>
));
