export const getValidatedBuyResponse = (response, contract_type) => {
    if (response?.error) {
        throw new Error(
            response.error.message ||
                `Bot Builder could not purchase the ${contract_type} contract because Deriv returned an error.`
        );
    }

    const buy = response?.buy;

    if (!buy) {
        throw new Error(
            `Bot Builder could not confirm the ${contract_type} purchase because Deriv did not return a buy response.`
        );
    }

    const missing_fields = ['contract_id', 'transaction_id'].filter(
        field => buy[field] === undefined || buy[field] === null || buy[field] === ''
    );

    if (missing_fields.length) {
        throw new Error(
            `Bot Builder could not confirm the ${contract_type} purchase because the buy response is missing ${missing_fields.join(
                ' and '
            )}.`
        );
    }

    return buy;
};
