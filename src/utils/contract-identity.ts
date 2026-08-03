export type TContractIdentity = {
    contract_id?: number | string;
    transaction_ids?: {
        buy?: number | string;
        sell?: number | string;
    };
};

const hasIdentifier = (value: unknown): value is number | string =>
    value !== undefined && value !== null && value !== '';

export const hasContractIdentity = (contract?: TContractIdentity | null) =>
    hasIdentifier(contract?.transaction_ids?.buy) || hasIdentifier(contract?.contract_id);

export const contractsReferToSameTrade = (first?: TContractIdentity | null, second?: TContractIdentity | null) => {
    const first_buy_id = first?.transaction_ids?.buy;
    const second_buy_id = second?.transaction_ids?.buy;

    if (hasIdentifier(first_buy_id) && hasIdentifier(second_buy_id)) {
        return String(first_buy_id) === String(second_buy_id);
    }

    return (
        hasIdentifier(first?.contract_id) &&
        hasIdentifier(second?.contract_id) &&
        String(first.contract_id) === String(second.contract_id)
    );
};

export const mergeContractUpdate = <T extends TContractIdentity>(previous: T | undefined, incoming: T): T => {
    if (!previous) return incoming;

    return {
        ...previous,
        ...incoming,
        transaction_ids: {
            ...(previous.transaction_ids || {}),
            ...(incoming.transaction_ids || {}),
        },
    };
};

export const getContractRowKey = (contract?: TContractIdentity | null) => {
    if (hasIdentifier(contract?.transaction_ids?.buy)) {
        return `buy-${contract.transaction_ids.buy}`;
    }
    if (hasIdentifier(contract?.contract_id)) {
        return `contract-${contract.contract_id}`;
    }
    return 'contract-without-id';
};
