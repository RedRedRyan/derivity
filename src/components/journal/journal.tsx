import classnames from 'classnames';
import { observer } from 'mobx-react-lite';
import { getAssetIconComponent } from '@/components/shared_ui/figma-icons/asset-icons';
import Text from '@/components/shared_ui/text';
import { contract_stages } from '@/constants/contract-stage';
import { useStore } from '@/hooks/useStore';
// import { DerivLightEmptyCardboardBoxIcon } from '@/components/shared_ui/figma-icons';
import { Localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import DataList from '../data-list';
import { TFilterMessageValues, TJournalDataListArgs } from './journal.types';
import { JournalItem, JournalLoader, JournalTools } from './journal-components';

type TJournal = {
    is_drawer_open: boolean;
};

const Journal = observer(({ is_drawer_open }: TJournal) => {
    const ReportsIcon = getAssetIconComponent('IcReports');
    const { journal, run_panel } = useStore();
    const { checked_filters, filterMessage, filters, filtered_messages, is_filter_dialog_visible, toggleFilterDialog } =
        journal;
    const { is_stop_button_visible, contract_stage } = run_panel;

    const filtered_messages_length = Array.isArray(filtered_messages) && filtered_messages.length;
    const { isDesktop } = useDevice();
    const is_bot_active =
        is_stop_button_visible ||
        (contract_stage >= contract_stages.STARTING && contract_stage !== contract_stages.NOT_RUNNING);
    const show_loader = is_bot_active && !filtered_messages_length;

    return (
        <div
            className={classnames('journal run-panel-tab__content--no-stat', {
                'run-panel-tab__content': isDesktop,
                'run-panel-tab__content--mobile-no-stat': !isDesktop && is_drawer_open,
            })}
            data-testid='dt_mock_journal'
        >
            <JournalTools
                checked_filters={checked_filters}
                filters={filters}
                filterMessage={filterMessage}
                is_filter_dialog_visible={is_filter_dialog_visible}
                toggleFilterDialog={toggleFilterDialog}
            />
            <div className='journal__item-list'>
                {filtered_messages_length ? (
                    <DataList
                        className='journal'
                        data_source={filtered_messages}
                        rowRenderer={args => <JournalItem {...(args as TJournalDataListArgs)} />}
                        keyMapper={row => (row as TFilterMessageValues).unique_id}
                    />
                ) : show_loader ? (
                    <JournalLoader is_mobile={!isDesktop} />
                ) : (
                    <div className='journal-empty'>
                        <ReportsIcon aria-hidden='true' iconSize='xl' />
                        <Text
                            as='h4'
                            size='xs'
                            weight='bold'
                            align='center'
                            color='less-prominent'
                            lineHeight='s'
                            className='journal-empty__header'
                        >
                            <Localize i18n_default_text='There are no messages to display' />
                        </Text>
                        <div className='journal-empty__message'>
                            <Text size='xxs' color='less-prominent'>
                                <Localize i18n_default_text='Here are the possible reasons:' />
                            </Text>
                            <ul className='journal-empty__list'>
                                <li>
                                    <Text size='xxs' color='less-prominent'>
                                        <Localize i18n_default_text='The bot is not running' />
                                    </Text>
                                </li>
                                <li>
                                    <Text size='xxs' color='less-prominent'>
                                        <Localize i18n_default_text='The stats are cleared' />
                                    </Text>
                                </li>
                                <li>
                                    <Text size='xxs' color='less-prominent'>
                                        <Localize i18n_default_text='All messages are filtered out' />
                                    </Text>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export default Journal;
