import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { LegacyNotificationIcon } from '@/components/shared_ui/figma-icons/Legacy';
import { BOT_ANNOUNCEMENTS_LIST } from '@/pages/dashboard/announcements/config';
import { useTranslations } from '@deriv-com/translations';
import { Notifications, Tooltip, useDevice } from '@deriv-com/ui';
import './custom-notifications.scss';

const CustomNotifications = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [readNotifications, setReadNotifications] = useState<Record<string, boolean>>({});
    const { localize } = useTranslations();
    const { isMobile } = useDevice();
    const storageKey = 'riskmanagers-notifications';

    useEffect(() => {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                setReadNotifications(JSON.parse(stored));
                return;
            } catch {
                localStorage.removeItem(storageKey);
            }
        }

        const defaultState = Object.fromEntries(BOT_ANNOUNCEMENTS_LIST.map(item => [item.id, true]));
        setReadNotifications(defaultState);
        localStorage.setItem(storageKey, JSON.stringify(defaultState));
    }, []);

    const notifications = useMemo(
        () =>
            BOT_ANNOUNCEMENTS_LIST.map(item => ({
                id: item.id,
                icon: <item.icon announce={readNotifications[item.id] ?? true} />,
                title: item.title,
                message: item.message,
                buttonAction: undefined,
                actionText: item.actionText,
            })),
        [readNotifications]
    );

    const unreadCount = Object.values(readNotifications).filter(Boolean).length;

    const persistNotifications = (nextState: Record<string, boolean>) => {
        setReadNotifications(nextState);
        localStorage.setItem(storageKey, JSON.stringify(nextState));
    };

    return (
        <div className='notifications__wrapper'>
            <Tooltip
                as='button'
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen && unreadCount) {
                        persistNotifications(Object.fromEntries(BOT_ANNOUNCEMENTS_LIST.map(item => [item.id, false])));
                    }
                }}
                tooltipContent={localize('View notifications')}
                tooltipPosition='bottom'
            >
                <LegacyNotificationIcon iconSize='sm' />
            </Tooltip>
            <Notifications
                className={clsx('', {
                    'notifications__wrapper--mobile': isMobile,
                    'notifications__wrapper--desktop': !isMobile,
                })}
                componentConfig={{
                    clearButtonText: localize('Mark all as read'),
                    modalTitle: localize('Notifications'),
                    noNotificationsMessage: localize('You are all caught up.'),
                    noNotificationsTitle: localize('No notifications'),
                }}
                isOpen={isOpen}
                notifications={notifications}
                setIsOpen={setIsOpen}
                clearNotificationsCallback={() => {
                    persistNotifications(Object.fromEntries(BOT_ANNOUNCEMENTS_LIST.map(item => [item.id, false])));
                }}
                loadMoreFunction={() => {}}
                isLoading={false}
            />
        </div>
    );
};

export default CustomNotifications;
