/**
 * Centralized WebSocket handler for safely subscribing to observables.
 * Wraps event listeners in try/catch and logs errors with stack traces to prevent unhandled exceptions.
 */

export const safeSubscribe = (
    observable: any,
    onData: (data: any) => void,
    onError?: (error: unknown) => void,
    onComplete?: () => void
) => {
    if (!observable || typeof observable.subscribe !== 'function') {
        console.error('[WebSocketHandler] Invalid observable provided to safeSubscribe');
        return { unsubscribe: () => {} };
    }

    const safeOnData = (data: any) => {
        try {
            onData(data);
        } catch (err) {
            console.error('[WebSocketHandler] Exception in onData listener:\n', err instanceof Error ? err.stack : err);
        }
    };

    const safeOnError = (error: unknown) => {
        try {
            if (onError) {
                onError(error);
            } else {
                console.error(
                    '[WebSocketHandler] Unhandled stream error:\n',
                    error instanceof Error ? error.stack : error
                );
            }
        } catch (err) {
            console.error(
                '[WebSocketHandler] Exception in onError listener:\n',
                err instanceof Error ? err.stack : err
            );
        }
    };

    const safeOnComplete = () => {
        try {
            onComplete?.();
        } catch (err) {
            console.error(
                '[WebSocketHandler] Exception in onComplete listener:\n',
                err instanceof Error ? err.stack : err
            );
        }
    };

    try {
        const subscription = observable.subscribe(safeOnData, safeOnError, safeOnComplete);
        const originalUnsubscribe = subscription?.unsubscribe?.bind(subscription);
        return {
            unsubscribe: () => {
                try {
                    if (originalUnsubscribe) originalUnsubscribe();
                } catch (err) {
                    console.error(
                        '[WebSocketHandler] Exception during unsubscribe:\n',
                        err instanceof Error ? err.stack : err
                    );
                }
            },
            ...subscription,
        };
    } catch (err) {
        console.error('[WebSocketHandler] Exception during subscribe:\n', err instanceof Error ? err.stack : err);
        return { unsubscribe: () => {} };
    }
};
