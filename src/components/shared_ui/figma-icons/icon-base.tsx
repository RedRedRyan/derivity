import { forwardRef, type CSSProperties, type SVGProps } from 'react';

export type IconSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type FigmaIconProps = Omit<SVGProps<SVGSVGElement>, 'ref'> & {
    fill?: string;
    iconSize?: IconSize;
};

const SIZE_MAP: Record<IconSize, number> = {
    '2xs': 12,
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 40,
};

const toNumber = (value: unknown) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
};

export const resolveIconSize = ({ iconSize = 'md', width, height }: FigmaIconProps) => {
    const fallback = SIZE_MAP[iconSize];
    return {
        width: toNumber(width) ?? fallback,
        height: toNumber(height) ?? fallback,
    };
};

const mergeStyle = (style: CSSProperties | undefined, fill: string | undefined): CSSProperties | undefined =>
    fill
        ? {
              color: fill,
              ...style,
          }
        : style;

export const createStrokeIcon = (
    render: (props: { stroke: string; strokeWidth: number }) => React.ReactNode,
    options?: { strokeWidth?: number }
) =>
    forwardRef<SVGSVGElement, FigmaIconProps>(({ fill, iconSize = 'md', style, ...props }, ref) => {
        const { width, height } = resolveIconSize({ iconSize, ...props });
        const stroke = fill || 'currentColor';

        return (
            <svg
                {...props}
                ref={ref}
                viewBox='0 0 24 24'
                width={width}
                height={height}
                fill='none'
                stroke='none'
                style={mergeStyle(style, fill)}
                xmlns='http://www.w3.org/2000/svg'
            >
                {render({ stroke, strokeWidth: options?.strokeWidth ?? 1.9 })}
            </svg>
        );
    });

export const createFillIcon = (render: (fill: string) => React.ReactNode) =>
    forwardRef<SVGSVGElement, FigmaIconProps>(({ fill, iconSize = 'md', style, ...props }, ref) => {
        const { width, height } = resolveIconSize({ iconSize, ...props });
        const color = fill || 'currentColor';

        return (
            <svg
                {...props}
                ref={ref}
                viewBox='0 0 24 24'
                width={width}
                height={height}
                fill='none'
                stroke='none'
                style={mergeStyle(style, fill)}
                xmlns='http://www.w3.org/2000/svg'
            >
                {render(color)}
            </svg>
        );
    });

export const createBadgeIcon = ({
    accent = '#0f766e',
    background = '#ecfeff',
    label,
}: {
    accent?: string;
    background?: string;
    label: string;
}) =>
    forwardRef<SVGSVGElement, FigmaIconProps>(({ fill, iconSize = 'md', style, ...props }, ref) => {
        const { width, height } = resolveIconSize({ iconSize, ...props });
        const color = fill || accent;

        return (
            <svg
                {...props}
                ref={ref}
                viewBox='0 0 24 24'
                width={width}
                height={height}
                style={mergeStyle(style, fill)}
                xmlns='http://www.w3.org/2000/svg'
            >
                <rect x='2.25' y='2.25' width='19.5' height='19.5' rx='6' fill={background} />
                <rect
                    x='2.25'
                    y='2.25'
                    width='19.5'
                    height='19.5'
                    rx='6'
                    stroke={color}
                    strokeWidth='1.5'
                    fill='none'
                />
                <text
                    x='12'
                    y='14'
                    textAnchor='middle'
                    fill={color}
                    fontSize='7'
                    fontFamily='system-ui, sans-serif'
                    fontWeight='700'
                    letterSpacing='0.2'
                >
                    {label}
                </text>
            </svg>
        );
    });
