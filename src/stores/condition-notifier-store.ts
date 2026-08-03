import { makeAutoObservable } from 'mobx';

interface ConditionNotification {
    market: string;
    condition: string;
    digits: string;
    result: boolean;
    source: string;
    timestamp: number;
}

class ConditionNotifierStore {
    latest: ConditionNotification | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    setCondition(notification: ConditionNotification) {
        this.latest = notification;
    }

    clear() {
        this.latest = null;
    }
}

export const conditionNotifierStore = new ConditionNotifierStore();
