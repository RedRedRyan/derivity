import { TWebSocket } from './ws.types';

export type TDbotStore = {
    client: unknown;
    flyout: unknown;
    toolbar: unknown;
    save_modal: unknown;
    dashboard: unknown;
    load_modal: unknown;
    run_panel: unknown;
    setLoading: (is_loading: boolean) => void;
    setContractUpdateConfig: (contract_update_config: unknown) => void;
    handleFileChange: (
        event: React.MouseEvent<Element, MouseEvent> | React.FormEvent<HTMLFormElement> | DragEvent,
        is_body?: boolean
    ) => boolean;
    is_mobile: boolean;
};

export type TApiHelpersStore = {
    server_time: unknown;
    ws: TWebSocket;
};
