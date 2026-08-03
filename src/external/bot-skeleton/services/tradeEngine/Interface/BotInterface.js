import { observer as globalObserver } from '../../../utils/observer';
import { findCurrentProposal, getProposalNumericValue } from '../trade/proposal-utils';
import { createDetails } from '../utils/helpers';

const getBotInterface = tradeEngine => {
    const getDetail = i => createDetails(tradeEngine.data.contract)[i];

    return {
        init: (...args) => tradeEngine.init(...args),
        start: (...args) => tradeEngine.start(...args),
        stop: (...args) => tradeEngine.stop(...args),
        purchase: contract_type => tradeEngine.purchase(contract_type),
        getAskPrice: contract_type => getProposalNumericValue(getProposal(contract_type, tradeEngine), 'ask_price'),
        getPayout: contract_type => getProposalNumericValue(getProposal(contract_type, tradeEngine), 'payout'),
        getPurchaseReference: () => tradeEngine.getPurchaseReference(),
        isSellAvailable: () => tradeEngine.isSellAtMarketAvailable(),
        sellAtMarket: () => tradeEngine.sellAtMarket(),
        getSellPrice: () => getSellPrice(tradeEngine),
        isResult: result => getDetail(10) === result,
        isTradeAgain: result => globalObserver.emit('bot.trade_again', result),
        readDetails: i => getDetail(i - 1),
    };
};

const getProposal = (contract_type, tradeEngine) => {
    return findCurrentProposal({
        proposals: tradeEngine?.data?.proposals,
        contract_type,
        purchase_reference: tradeEngine?.getPurchaseReference?.(),
    });
};

const getSellPrice = tradeEngine => {
    return tradeEngine.getSellPrice();
};

export default getBotInterface;
