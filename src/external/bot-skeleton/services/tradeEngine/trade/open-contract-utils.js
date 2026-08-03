export const areContractIdsEqual = (first, second) =>
    first !== undefined &&
    first !== null &&
    second !== undefined &&
    second !== null &&
    String(first) === String(second);

export const normalizeOpenContract = (contract, previous_contract, closed_statuses) => {
    if (!contract) return contract;

    const is_same_contract = areContractIdsEqual(previous_contract?.contract_id, contract.contract_id);
    const merged_contract = is_same_contract
        ? {
              ...previous_contract,
              ...contract,
              transaction_ids: {
                  ...(previous_contract.transaction_ids || {}),
                  ...(contract.transaction_ids || {}),
              },
          }
        : contract;
    const normalized_status = String(merged_contract.status || '').toLowerCase();

    if (merged_contract.is_sold || !closed_statuses.has(normalized_status)) {
        return merged_contract;
    }

    return {
        ...merged_contract,
        is_sold: 1,
    };
};
