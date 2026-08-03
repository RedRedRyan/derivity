declare module '@deriv/stores/types' {
    export type TNotificationMessage = {
        key?: string;
        header?: string;
        message?: string;
        type?: string;
        is_persistent?: boolean;
        is_disposable?: boolean;
        platform?: string;
        action?: {
            text: string;
            onClick: () => void;
        };
    };

    export type TStores = {
        client: any;
        common: any;
        ui: any;
    };

    export type TPortfolioPosition = any;
}

declare module 'Types' {
    export type TDbot = any;
}

declare module '@deriv-com/utils' {
    export const BrandConstants: {
        platforms: {
            dBot: string;
            [key: string]: string;
        };
    };
}
