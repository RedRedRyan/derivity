import { Localize } from '@deriv-com/translations';
import Button from '../shared_ui/button';
import Text from '../shared_ui/text';

type TErrorModalContent = {
    error_message?: string;
};

const ErrorIllustration = () => (
    <svg aria-hidden='true' height='120' viewBox='0 0 120 120' width='120'>
        <circle cx='60' cy='60' fill='#f2f3f4' r='52' />
        <path d='M60 24 104 96H16L60 24Z' fill='#ffcf55' stroke='#c27d00' strokeWidth='4' />
        <rect fill='#2a2a2a' height='34' rx='4' width='8' x='56' y='48' />
        <circle cx='60' cy='86' fill='#2a2a2a' r='5' />
    </svg>
);

const ErrorModalContent = ({ error_message }: TErrorModalContent) => {
    return (
        <div className='unhandled-error'>
            <ErrorIllustration />
            <Text className='da-icon-with-message__text' as='p' lineHeight='xxl' align='center' weight='bold'>
                <Localize i18n_default_text='Sorry for the interruption' />
            </Text>
            <Text className='da-icon-with-message__text__desc' as='p' size='xs' lineHeight='xxs' align='center'>
                {error_message}
            </Text>
            <Button onClick={() => location.reload()} has_effect primary large>
                <Localize i18n_default_text='Refresh' />
            </Button>
        </div>
    );
};

export default ErrorModalContent;
