/**
 * Diagnostics and Root-Cause Analysis Utilities
 *
 * Sets up global error handlers for uncaught exceptions and unhandled promise rejections.
 * Also includes a memory monitor for detecting potential memory leaks in the browser.
 */

type TDiagnosticEvent = {
    count: number;
    details?: unknown;
    lastSeenAt: string;
};

type TDiagnosticSnapshot = {
    counters: Record<string, TDiagnosticEvent>;
    gauges: Record<string, { value: unknown; updatedAt: string }>;
    recent: Array<{ name: string; details?: unknown; at: string }>;
};

declare global {
    interface Window {
        __dbotDiagnostics?: TDiagnosticSnapshot;
    }
}

let cleanupDiagnostics: (() => void) | null = null;
const diagnosticCounters = new Map<string, TDiagnosticEvent>();
const diagnosticGauges = new Map<string, { value: unknown; updatedAt: string }>();
const recentDiagnosticEvents: TDiagnosticSnapshot['recent'] = [];

const syncDiagnosticSnapshot = () => {
    if (typeof window === 'undefined') return;

    window.__dbotDiagnostics = {
        counters: Object.fromEntries(diagnosticCounters.entries()),
        gauges: Object.fromEntries(diagnosticGauges.entries()),
        recent: recentDiagnosticEvents.slice(-50),
    };
};

export const recordDiagnosticEvent = (name: string, details?: unknown) => {
    const now = new Date().toISOString();
    const previous = diagnosticCounters.get(name);
    diagnosticCounters.set(name, {
        count: (previous?.count ?? 0) + 1,
        details,
        lastSeenAt: now,
    });
    recentDiagnosticEvents.push({ name, details, at: now });
    if (recentDiagnosticEvents.length > 100) {
        recentDiagnosticEvents.splice(0, recentDiagnosticEvents.length - 100);
    }
    syncDiagnosticSnapshot();
};

export const setDiagnosticGauge = (name: string, value: unknown) => {
    diagnosticGauges.set(name, {
        value,
        updatedAt: new Date().toISOString(),
    });
    syncDiagnosticSnapshot();
};

export const clearDiagnosticGauge = (name: string) => {
    diagnosticGauges.delete(name);
    syncDiagnosticSnapshot();
};

export const setupDiagnostics = () => {
    if (cleanupDiagnostics) return cleanupDiagnostics;

    const handleError = (event: ErrorEvent) => {
        recordDiagnosticEvent('window.error', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
        });
        console.error('[Diagnostics] Uncaught Exception:', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error,
        });
        // Here you could send this to an external logging service.
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        recordDiagnosticEvent('window.unhandledrejection', {
            reason:
                event.reason instanceof Error
                    ? { name: event.reason.name, message: event.reason.message }
                    : event.reason,
        });
        console.error('[Diagnostics] Unhandled Promise Rejection:', {
            reason: event.reason,
        });
    };

    const handleVisibilityChange = () => {
        recordDiagnosticEvent('window.visibilitychange', {
            visibilityState: document.visibilityState,
        });
    };

    // 1. Global Error Handlers (equivalent to process.on in Node.js)
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    recordDiagnosticEvent('diagnostics.ready');

    // 2. Memory Monitor
    const MEMORY_THRESHOLD_MB = 500; // Flag if heap grows beyond 500MB

    const checkMemory = () => {
        const perf = window.performance as any;
        if (perf && perf.memory) {
            const usedHeapMB = Math.round(perf.memory.usedJSHeapSize / (1024 * 1024));
            const totalHeapMB = Math.round(perf.memory.totalJSHeapSize / (1024 * 1024));
            const limitMB = Math.round(perf.memory.jsHeapSizeLimit / (1024 * 1024));

            if (usedHeapMB > MEMORY_THRESHOLD_MB) {
                recordDiagnosticEvent('memory.high_usage', {
                    usedHeapMB,
                    totalHeapMB,
                    limitMB,
                });
                console.warn(
                    `[Diagnostics] High Memory Usage Detected: ${usedHeapMB}MB used of ${totalHeapMB}MB allocated (Limit: ${limitMB}MB). Possible memory leak.`
                );
            }
        }
    };

    // Check memory every 30 seconds
    const memoryInterval = setInterval(checkMemory, 30000);

    cleanupDiagnostics = () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        clearInterval(memoryInterval);
        cleanupDiagnostics = null;
    };

    return cleanupDiagnostics;
};
