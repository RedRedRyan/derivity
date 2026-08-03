import { memo } from 'react';
import { ChartMode, DrawTools, Share, StudyLegend, ToolbarWidget, Views } from '@deriv-com/smartcharts-champion';
import { useDevice } from '@deriv-com/ui';
import { useStore } from '@/hooks/useStore';

type TToolbarWidgetsProps = {
    updateChartType: (chart_type: string) => void;
    updateGranularity: (updateGranularity: number) => void;
    position?: string | null;
    isDesktop?: boolean;
};

const ToolbarWidgets = ({ updateChartType, updateGranularity, position, isDesktop }: TToolbarWidgetsProps) => {
    const { isMobile } = useDevice();
    const { ui } = useStore();

    return (
        <ToolbarWidget position={position || (isMobile ? 'bottom' : 'top')}>
            <ChartMode portalNodeId='modal_root' onChartType={updateChartType} onGranularity={updateGranularity} />
            {isDesktop && (
                <>
                    <StudyLegend portalNodeId='modal_root' searchInputClassName='data-hj-whitelist' />
                    <Views
                        portalNodeId='modal_root'
                        onChartType={updateChartType}
                        onGranularity={updateGranularity}
                        searchInputClassName='data-jh-whitelist'
                    />
                </>
            )}
            <DrawTools portalNodeId='modal_root' />
            {isDesktop && (
                <>
                    <Share portalNodeId='modal_root' />
                    <button
                        className='settings-toolbar-button'
                        onClick={() => ui.setShowChartSettingsModal(true)}
                        aria-label='Chart Settings'
                    >
                        <svg
                            width='24'
                            height='24'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                        >
                            <circle cx='12' cy='12' r='10'></circle>
                            <line x1='12' y1='8' x2='12' y2='12'></line>
                            <line x1='12' y1='16' x2='12' y2='16'></line>
                        </svg>
                    </button>
                </>
            )}
        </ToolbarWidget>
    );
};

export default memo(ToolbarWidgets);
