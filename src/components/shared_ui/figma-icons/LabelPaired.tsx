import { createFillIcon, createStrokeIcon } from './icon-base';

export const LabelPairedSearchCaptionRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <circle cx='11' cy='11' r='5' stroke={stroke} strokeWidth={strokeWidth} />
        <path d='M15 15l4 4' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
    </>
));

export const LabelPairedChevronDownMdFillIcon = createFillIcon(fill => (
    <path d='M7 10l5 5 5-5' fill='none' stroke={fill} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
));

export const LabelPairedChevronDownLgRegularIcon = LabelPairedChevronDownMdFillIcon;

export const LabelPairedPlusCaptionRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <path d='M12 6v12M6 12h12' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
));

export const LabelPairedPlusLgFillIcon = LabelPairedPlusCaptionRegularIcon;

export const LabelPairedMinusCaptionRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <path d='M6 12h12' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
));

export const LabelPairedArrowRotateLeftMdRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path d='M8 8H4v4' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' strokeLinejoin='round' />
        <path d='M5 11a7 7 0 111.9 4.9' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
    </>
));

export const LabelPairedArrowRotateRightMdRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path d='M16 8h4v4' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' strokeLinejoin='round' />
        <path d='M19 11a7 7 0 10-1.9 4.9' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
    </>
));

export const LabelPairedArrowsRotateMdRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path
            d='M8 7H4v4M20 13v4h-4'
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path
            d='M5 11a7 7 0 0112-3M19 13a7 7 0 01-12 3'
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap='round'
        />
    </>
));

export const LabelPairedChartLineMdRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path d='M5 18h14' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
        <path
            d='M7 15l3-4 3 2 4-6'
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </>
));

export const LabelPairedChartLineCaptionRegularIcon = LabelPairedChartLineMdRegularIcon;

export const LabelPairedChartMixedCaptionRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path d='M5 18h14' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
        <path d='M7 16v-3M11 16V9M15 16v-5' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
        <path d='M6 10l3-2 3 1 4-3' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
    </>
));

export const LabelPairedChartTrendUpCaptionRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path d='M5 18h14' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
        <path
            d='M7 15l4-4 3 2 4-6'
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </>
));

export const LabelPairedFloppyDiskMdRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path d='M6 5h10l2 2v12H6z' stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin='round' />
        <path d='M9 5v5h6V5M9 18v-4h6v4' stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin='round' />
    </>
));

export const LabelPairedFolderOpenMdRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path
            d='M4 9h6l2 2h8v6.5A1.5 1.5 0 0118.5 19h-13A1.5 1.5 0 014 17.5z'
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin='round'
        />
        <path
            d='M4 9V7a1.5 1.5 0 011.5-1.5h4L11 7h7.5A1.5 1.5 0 0120 8.5V11'
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin='round'
        />
    </>
));

export const LabelPairedMagnifyingGlassPlusMdRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <circle cx='11' cy='11' r='5' stroke={stroke} strokeWidth={strokeWidth} />
        <path d='M11 8.5v5M8.5 11h5M15 15l4 4' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
    </>
));

export const LabelPairedMagnifyingGlassMinusMdRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <circle cx='11' cy='11' r='5' stroke={stroke} strokeWidth={strokeWidth} />
        <path d='M8.5 11h5M15 15l4 4' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
    </>
));

export const LabelPairedObjectsAlignLeftMdRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path d='M7 6v12M10 8h7M10 12h5M10 16h8' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
    </>
));

export const LabelPairedObjectsColumnCaptionRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <rect x='5' y='7' width='4' height='10' rx='1' stroke={stroke} strokeWidth={strokeWidth} />
        <rect x='10' y='7' width='4' height='10' rx='1' stroke={stroke} strokeWidth={strokeWidth} />
        <rect x='15' y='7' width='4' height='10' rx='1' stroke={stroke} strokeWidth={strokeWidth} />
    </>
));

export const LabelPairedPuzzlePieceTwoCaptionBoldIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <path
        d='M9 7a2 2 0 114 0h2.5A1.5 1.5 0 0117 8.5V11a2 2 0 110 4v2.5a1.5 1.5 0 01-1.5 1.5H13a2 2 0 10-4 0H6.5A1.5 1.5 0 015 17.5V15a2 2 0 100-4V8.5A1.5 1.5 0 016.5 7H9z'
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin='round'
        fill={stroke} // ensures inside matches stroke color
    />
));

export const LabelPairedPlaceholderCaptionRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <rect x='5' y='6' width='14' height='12' rx='2' stroke={stroke} strokeWidth={strokeWidth} />
        <path
            d='M8 14l2.5-2.5 2 2 3.5-4 2 5'
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <circle cx='9' cy='10' r='1' fill={stroke} />
    </>
));

export const LabelPairedLightbulbCaptionRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path d='M9 15.5h6M10 18h4' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
        <path
            d='M8.5 14a5 5 0 117 0c-.8.9-1.5 1.8-1.8 2.8h-3.4c-.3-1-.9-1.9-1.8-2.8z'
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin='round'
            fill='#F0050C'
        />
    </>
));

export const LabelPairedCircleStarCaptionRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <circle cx='12' cy='12' r='8.5' stroke={stroke} strokeWidth={strokeWidth} />
        <path
            d='M12 8.2l1.2 2.4 2.7.4-1.9 1.9.5 2.7L12 14.3l-2.5 1.3.5-2.7L8.1 11l2.7-.4L12 8.2z'
            stroke={stroke}
            strokeWidth={1.5}
            strokeLinejoin='round'
        />
    </>
));

export const LabelPairedLoaderMdBoldIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path d='M18.5 12a6.5 6.5 0 10-2 4.7' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
        <path d='M17.8 8.2A6.5 6.5 0 0118.5 12' stroke={stroke} strokeWidth={3} strokeLinecap='round' />
    </>
));

export const LabelPairedPlayLgFillIcon = createFillIcon(fill => <path d='M8 6.5v11l9-5.5-9-5.5z' fill={fill} />);

export const LabelPairedSquareLgFillIcon = createFillIcon(fill => (
    <rect x='7' y='7' width='10' height='10' rx='1.5' fill={fill} />
));

export const LabelPairedCircleCheckMdFillIcon = createFillIcon(fill => (
    <>
        <circle cx='12' cy='12' r='8.5' fill={fill} opacity='0.18' />
        <circle cx='12' cy='12' r='8.5' stroke={fill} strokeWidth='1.5' fill='none' />
        <path
            d='M8.8 12.2l2.1 2.1 4.3-4.6'
            stroke={fill}
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </>
));

export const LabelPairedCircleCheckMdRegularIcon = LabelPairedCircleCheckMdFillIcon;

export const LabelPairedCheckCaptionFillIcon = LabelPairedCircleCheckMdFillIcon;

export const LabelPairedCircleXmarkMdRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <circle cx='12' cy='12' r='8.5' stroke={stroke} strokeWidth={strokeWidth} />
        <path d='M9 9l6 6M15 9l-6 6' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
    </>
));

export const LabelPairedCircleInfoCaptionRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <circle cx='12' cy='12' r='8.5' stroke={stroke} strokeWidth={strokeWidth} />
        <path d='M12 10.5V16' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
        <circle cx='12' cy='8' r='1' fill={stroke} />
    </>
));

export const LabelPairedPageCircleArrowRightSmRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path d='M8 5h7l3 3v11H8z' stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin='round' />
        <path d='M15 5v3h3' stroke={stroke} strokeWidth={strokeWidth} />
        <path
            d='M10 13h5M13 10l3 3-3 3'
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </>
));

export const LabelPairedTrashSmRegularIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path
            d='M7 8h10M9 8V6.8A1.8 1.8 0 0110.8 5h2.4A1.8 1.8 0 0115 6.8V8M8.2 8l.7 9h6.2l.7-9'
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </>
));

export const LabelPairedArrowLeftCaptionFillIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <path
        d='M14.5 6.5L9 12l5.5 5.5'
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeLinejoin='round'
    />
));

export const LabelPairedArrowLeftCaptionRegularIcon = LabelPairedArrowLeftCaptionFillIcon;

export const LabelPairedBarsFilterCaptionFillIcon = createStrokeIcon(({ stroke, strokeWidth }) => (
    <>
        <path d='M5 7h14M8 12h8M10 17h4' stroke={stroke} strokeWidth={strokeWidth} strokeLinecap='round' />
    </>
));

export const LabelPairedCircleDotCaptionFillIcon = createFillIcon(fill => (
    <>
        <circle cx='12' cy='12' r='8.5' fill={fill} opacity='0.12' />
        <circle cx='12' cy='12' r='8.5' stroke={fill} strokeWidth='1.5' fill='none' />
        <circle cx='12' cy='12' r='2.4' fill={fill} />
    </>
));
