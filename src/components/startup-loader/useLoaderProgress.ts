import { useState, useEffect, useCallback, useRef } from 'react';

interface UseLoaderProgressOptions {
    appReady: boolean;
    minimumDuration: number;
    maximumDuration: number;
    onProgress?: (progress: number) => void;
}

/**
 * Hook to manage loader progress with realistic simulation
 */
export function useLoaderProgress({
    appReady,
    minimumDuration,
    maximumDuration,
    onProgress,
}: UseLoaderProgressOptions) {
    const [progress, setProgress] = useState(0);
    const startTimeRef = useRef<number>(Date.now());
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const calculateNextProgress = useCallback((currentProgress: number): number => {
        // 0-25%: fast (up to 5% per update)
        // 25-65%: moderate (up to 3% per update)
        // 65-90%: slower (up to 1.5% per update)
        // 90-99%: very slow (up to 0.5% per update)
        // Reserve 100% for completion

        const random = () => Math.random();

        if (currentProgress < 25) {
            return currentProgress + 2 + random() * 3;
        } else if (currentProgress < 65) {
            return currentProgress + 1 + random() * 2;
        } else if (currentProgress < 90) {
            return currentProgress + 0.5 + random() * 1;
        } else if (currentProgress < 99) {
            return currentProgress + 0.1 + random() * 0.4;
        }

        return Math.min(currentProgress, 99);
    }, []);

    useEffect(() => {
        startTimeRef.current = Date.now();

        const updateProgress = () => {
            const elapsed = Date.now() - startTimeRef.current;
            const timeProgress = Math.min((elapsed / maximumDuration) * 100, 99);

            setProgress(currentProgress => {
                const simulatedProgress = calculateNextProgress(currentProgress);
                // Use the maximum of time-based and simulated progress to ensure progress moves
                const nextProgress = Math.min(Math.max(simulatedProgress, timeProgress * 0.8), appReady ? 100 : 99);

                onProgress?.(nextProgress);
                return nextProgress;
            });
        };

        // Initial rapid progress
        intervalRef.current = setInterval(updateProgress, 150);

        // Safety timeout to enforce maximum duration
        timeoutRef.current = setTimeout(() => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            setProgress(100);
            onProgress?.(100);
        }, maximumDuration);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [maximumDuration, calculateNextProgress, onProgress, appReady]);

    // Handle app ready state
    useEffect(() => {
        const elapsed = Date.now() - startTimeRef.current;

        if (appReady && elapsed >= minimumDuration) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            setProgress(100);
            onProgress?.(100);
        }
    }, [appReady, minimumDuration, onProgress]);

    // Check minimum duration before allowing completion
    useEffect(() => {
        if (progress >= 99 && appReady) {
            const elapsed = Date.now() - startTimeRef.current;
            if (elapsed >= minimumDuration) {
                setProgress(100);
                onProgress?.(100);
            }
        }
    }, [progress, appReady, minimumDuration, onProgress]);

    return { progress };
}
