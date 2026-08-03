export type TExecutionMode = 'fast' | 'slow';

export interface IExecutionConfig {
    mode: TExecutionMode;
    backoffBaseDelay: number;
    backoffMaxDelay: number;
    connectionTimeout: number;
    subscriptionDebounce: number;
    enableBatching: boolean;
    batchInterval: number;
    maxRetries: number;
    retryDelay: number;
    settlementCheckMs: number;
    settlementRecoveryCheckMs: number;
}

export const EXECUTION_MODES: Record<TExecutionMode, IExecutionConfig> = {
    fast: {
        mode: 'fast',
        backoffBaseDelay: 1.0,
        backoffMaxDelay: 5.0,
        connectionTimeout: 5000,
        subscriptionDebounce: 100,
        enableBatching: true,
        batchInterval: 50,
        maxRetries: 3,
        retryDelay: 500,
        settlementCheckMs: 250,
        settlementRecoveryCheckMs: 500,
    },
    slow: {
        mode: 'slow',
        backoffBaseDelay: 2.5,
        backoffMaxDelay: 15.0,
        connectionTimeout: 10000,
        subscriptionDebounce: 250,
        enableBatching: false,
        batchInterval: 0,
        maxRetries: 5,
        retryDelay: 1000,
        settlementCheckMs: 500,
        settlementRecoveryCheckMs: 1000,
    },
};

export const getExecutionConfig = (mode: TExecutionMode = 'slow'): IExecutionConfig => {
    return EXECUTION_MODES[mode] || EXECUTION_MODES.slow;
};
