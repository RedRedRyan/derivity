import { api_base } from '@/external/bot-skeleton';
import { authData$ } from '@/external/bot-skeleton/services/api/observables/connection-status-stream';
import {
    ApiTokenAccountDetails,
    clearApiTokenSession,
    getApiTokenAccountDetails,
    getApiTokenLoginError,
    normalizeApiTokenInput,
    startApiTokenSession,
} from '@/utils/api-token-permissions';

const TOKEN_LOGIN_TIMEOUT_MS = 15000;

export class ApiTokenAuthService {
    static async loginWithToken(input: string): Promise<ApiTokenAccountDetails> {
        const token = normalizeApiTokenInput(input);

        if (!token) {
            throw new Error('Please enter a valid API token.');
        }

        startApiTokenSession(token);

        const authPromise = new Promise<ApiTokenAccountDetails>((resolve, reject) => {
            let errorCheckInterval: number;
            let subscription: { unsubscribe: () => void };
            const timeout = window.setTimeout(() => {
                window.clearInterval(errorCheckInterval);
                subscription?.unsubscribe();
                reject(new Error('Token login timed out. Please check the token and try again.'));
            }, TOKEN_LOGIN_TIMEOUT_MS);

            errorCheckInterval = window.setInterval(() => {
                const error = getApiTokenLoginError();
                if (error) {
                    window.clearTimeout(timeout);
                    window.clearInterval(errorCheckInterval);
                    subscription?.unsubscribe();
                    reject(new Error(error));
                }
            }, 250);

            subscription = authData$.subscribe(() => {
                const details = getApiTokenAccountDetails();
                if (details) {
                    window.clearTimeout(timeout);
                    window.clearInterval(errorCheckInterval);
                    subscription?.unsubscribe();
                    resolve(details);
                }
            });
        });

        try {
            await api_base.init(true);
            return await authPromise;
        } catch (error) {
            clearApiTokenSession();
            throw error;
        }
    }
}
