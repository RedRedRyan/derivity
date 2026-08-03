// Removed unused React import - React 17+ JSX transform doesn't require it
import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '@/hooks/useStore';
import Chart from './chart';
import './chart.scss';

interface ChartWrapperProps {
    chart_type_override?: string;
    granularity_override?: number;
    prefix?: string;
    show_digits_stats: boolean;
    refresh_token?: string | number;
}

const ChartWrapper = observer(
    ({
        chart_type_override,
        granularity_override,
        prefix = 'chart',
        show_digits_stats,
        refresh_token,
    }: ChartWrapperProps) => {
        const { client } = useStore();
        const [uuid] = useState(uuidv4());

        const instanceId = client.loginid ? `${prefix}-${client.loginid}` : `${prefix}-${uuid}`;
        const uniqueKey = refresh_token
            ? `${instanceId}-${refresh_token}-${chart_type_override ?? 'store'}-${granularity_override ?? 'store'}`
            : instanceId;

        return (
            <Chart
                key={uniqueKey}
                chart_instance_id={instanceId}
                chart_type_override={chart_type_override}
                granularity_override={granularity_override}
                show_digits_stats={show_digits_stats}
            />
        );
    }
);

export default ChartWrapper;
