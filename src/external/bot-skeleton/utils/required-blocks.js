export const PURCHASE_BLOCK_TYPES = ['purchase', 'smart_purchase_contract', 'apollo_purchase'];

export const isPurchaseBlockType = block_type => PURCHASE_BLOCK_TYPES.includes(block_type);

export const getCanonicalRequiredBlockType = block_type => (isPurchaseBlockType(block_type) ? 'purchase' : block_type);

export const getBlocksForRequiredType = (blocks, required_block_type) => {
    if (required_block_type === 'purchase') {
        return blocks.filter(block => isPurchaseBlockType(block?.type));
    }

    return blocks.filter(block => block?.type === required_block_type);
};

export const hasRequiredBlockType = (blocks, required_block_type) =>
    getBlocksForRequiredType(blocks, required_block_type).length > 0;
