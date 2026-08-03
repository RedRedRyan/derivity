import React from 'react';
import { getDefaultError } from '../shared/utils/constants';
import Button from '../shared_ui/button';
import DesktopWrapper from '../shared_ui/desktop-wrapper';
import MobileDialog from '../shared_ui/mobile-dialog';
import MobileWrapper from '../shared_ui/mobile-wrapper';
import Modal from '../shared_ui/modal';
import Text from '../shared_ui/text';

const ErrorIllustration = () => (
    <svg aria-hidden='true' height='120' viewBox='0 0 120 120' width='120'>
        <circle cx='60' cy='60' fill='#f2f3f4' r='52' />
        <path d='M60 24 104 96H16L60 24Z' fill='#ffcf55' stroke='#c27d00' strokeWidth='4' />
        <rect fill='#2a2a2a' height='34' rx='4' width='8' x='56' y='48' />
        <circle cx='60' cy='86' fill='#2a2a2a' r='5' />
    </svg>
);

const ModalContent = () => (
    <div className='unhandled-error'>
        <ErrorIllustration />

        <Text
            className='da-icon-with-message__text'
            as='p'
            size='s'
            color='general'
            lineHeight='xxl'
            align='center'
            weight='bold'
        >
            {getDefaultError().header}
        </Text>
        <Text
            className='da-icon-with-message__text__desc'
            as='p'
            size='xs'
            color='general'
            lineHeight='xxs'
            align='center'
        >
            {getDefaultError().description}
        </Text>
        <Button onClick={() => location.reload()} has_effect primary large text={getDefaultError().cta_label} />
    </div>
);

const UnhandledErrorModal = () => {
    const [is_page_error_modal_open, setPageErrorModalOpen] = React.useState<boolean>(false);

    React.useEffect(() => {
        setPageErrorModalOpen(true);
    }, []);

    const togglePageErrorModal = () => {
        setPageErrorModalOpen(!is_page_error_modal_open);
    };

    return (
        <Modal
            has_close_icon
            width='440px'
            height='284px'
            is_open={is_page_error_modal_open}
            toggleModal={togglePageErrorModal}
        >
            <DesktopWrapper>
                <Modal.Body>
                    <ModalContent />
                </Modal.Body>
            </DesktopWrapper>
            <MobileWrapper>
                <MobileDialog
                    portal_element_id='modal_root'
                    has_close_icon
                    visible={is_page_error_modal_open}
                    onClose={togglePageErrorModal}
                >
                    <Modal.Body>
                        <ModalContent />
                    </Modal.Body>
                </MobileDialog>
            </MobileWrapper>
        </Modal>
    );
};

export default UnhandledErrorModal;
