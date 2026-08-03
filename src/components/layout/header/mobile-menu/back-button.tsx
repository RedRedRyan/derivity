import { LegacyChevronLeft1pxIcon } from '@/components/shared_ui/figma-icons/Legacy';
import { Text, useDevice } from '@deriv-com/ui';

type TBackButton = {
    buttonText: string;
    onClick: () => void;
};

const BackButton = ({ buttonText, onClick }: TBackButton) => {
    const { isDesktop } = useDevice();

    return (
        <button className='flex items-center w-full pt-8 p-[3.2rem]' onClick={onClick}>
            <LegacyChevronLeft1pxIcon iconSize='xs' fill='var(--text-general)' />

            <Text className='ml-[1.6rem]' size={isDesktop ? 'md' : 'lg'} weight='bold'>
                {buttonText}
            </Text>
        </button>
    );
};

export default BackButton;
