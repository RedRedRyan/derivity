export const findCurrentProposal = ({ proposals, contract_type, purchase_reference }) => {
    if (!Array.isArray(proposals) || !contract_type || !purchase_reference) {
        return undefined;
    }

    const normalized_contract_type = String(contract_type).toUpperCase();

    return proposals.find(
        proposal =>
            proposal &&
            String(proposal.contract_type || '').toUpperCase() === normalized_contract_type &&
            proposal.purchase_reference === purchase_reference
    );
};

export const getProposalNumericValue = (proposal, field) => {
    const value = Number(proposal?.[field]);
    return Number.isFinite(value) && value > 0 ? value : 0;
};

export const getProposalPurchaseDetails = proposal => {
    const id = proposal?.id;
    const askPrice = getProposalNumericValue(proposal, 'ask_price');

    if (id === undefined || id === null || id === '' || askPrice <= 0) {
        return null;
    }

    return { id, askPrice };
};
