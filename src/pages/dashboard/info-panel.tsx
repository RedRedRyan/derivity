import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Modal from '@/components/shared_ui/modal';
import Text from '@/components/shared_ui/text';
import { useStore } from '@/hooks/useStore';
import { LegacyClose1pxIcon } from '@/components/shared_ui/figma-icons/Legacy';
import { useDevice } from '@deriv-com/ui';
import { SIDEBAR_INTRO } from './constants';

const InfoPanel = observer(() => {
    const { isDesktop } = useDevice();
    const { dashboard } = useStore();

    const [is_tour_open, setIsTourOpen] = React.useState(false);

    const { active_tour, is_info_panel_visible, setInfoPanelVisibility } = dashboard;

    const handleClose = () => {
        setInfoPanelVisibility(false);
        setIsTourOpen(false);
        localStorage.setItem('dbot_should_show_info', JSON.stringify(Date.now()));
    };

    React.useEffect(() => {
        if (is_info_panel_visible) {
            setIsTourOpen(true);
        } else {
            setIsTourOpen(false);
        }
    }, [is_info_panel_visible]);

    const renderInfo = () => (
        <div className='db-info-panel'>
            <div data-testid='close-icon' className='db-info-panel__close-action' onClick={handleClose}>
                <LegacyClose1pxIcon height='18px' width='18px' fill='var(--text-prominent)' />
            </div>

            {SIDEBAR_INTRO().map(sidebar_item => {
                const { label, content, link } = sidebar_item;
                return (
                    <div key={`${label}-${content}`}>
                        <Text color='prominent' lineHeight='xxl' size={isDesktop ? 'm' : 's'} weight='bold' as='h1'>
                            {label}
                        </Text>
                        {content.map(text => (
                            <Text
                                key={`info-panel-tour${text.data}`}
                                className={classNames('db-info-panel__card', {
                                    'db-info-panel__content': link,
                                })}
                                color='prominent'
                                lineHeight='xl'
                                as='p'
                                size={isDesktop ? 's' : 'xxs'}
                            >
                                {text.data}
                            </Text>
                        ))}
                    </div>
                );
            })}
        </div>
    );

    return isDesktop ? (
        !active_tour && (
            <div
                className={classNames('tab__dashboard__info-panel', {
                    'tab__dashboard__info-panel--active': is_info_panel_visible,
                })}
            >
                {renderInfo()}
            </div>
        )
    ) : (
        <Modal
            className='statistics__modal statistics__modal--mobile'
            is_open={is_tour_open}
            toggleModal={handleClose}
            width={'440px'}
        >
            <Modal.Body>{renderInfo()}</Modal.Body>
        </Modal>
    );
});

export default InfoPanel;
