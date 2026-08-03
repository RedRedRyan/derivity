import { memo, type ReactNode } from 'react';
import { getAssetIconComponent } from '@/components/shared_ui/figma-icons/asset-icons';

type TIconComponent = {
    icon: string;
    className?: string;
    onClick?: () => void;
    size?: number;
    height?: number | string;
    width?: number | string;
    id?: string;
    style?: { height?: number | string; width?: number | string };
};

const IconComponent: React.FC<TIconComponent> = ({ icon, ...rest }) => {
    const AssetIcon = getAssetIconComponent(icon);

    return (
        <div className='dummy-icon' {...rest}>
            <AssetIcon aria-hidden='true' iconSize='md' />
        </div>
    );
};

export const Icon = memo(IconComponent);

export const IconTradeTypes = ({ children }: { children: ReactNode }) => {
    // Simulate scrollbars
    return <div className='dummy-IconTradeTypes'>{children}</div>;
};
