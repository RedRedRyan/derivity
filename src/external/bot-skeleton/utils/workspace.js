import { config } from '../constants/config';
import { hasRequiredBlockType } from './required-blocks';

export const hasAllRequiredBlocks = () => {
    const blocks_in_workspace = window.Blockly.derivWorkspace.getAllBlocks();
    const { mandatoryMainBlocks } = config();
    const required_block_types = ['trade_definition_tradeoptions', ...mandatoryMainBlocks];
    const has_all_required_blocks = required_block_types.every(required_block_type =>
        hasRequiredBlockType(blocks_in_workspace, required_block_type)
    );

    return has_all_required_blocks;
};

export const onWorkspaceResize = () => {
    const workspace = window.Blockly.derivWorkspace;
    if (workspace) {
        // kept this commented to fix slow rendering issue
        //workspace.getAllFields().forEach(field => field.forceRerender());

        const el_scratch_div = document.getElementById('scratch_div');
        if (el_scratch_div) {
            window.Blockly.svgResize(workspace);
        }
    }
};

export const removeLimitedBlocks = (workspace, block_types) => {
    const types = Array.isArray(block_types) ? block_types : [block_types];

    types.forEach(block_type => {
        if (config().single_instance_blocks.includes(block_type)) {
            workspace.getAllBlocks().forEach(ws_block => {
                if (ws_block.type === block_type) {
                    ws_block.dispose();
                }
            });
        }
    });
};

export const isDbotRTL = () => {
    const htmlElement = document.documentElement;
    const dirValue = htmlElement.getAttribute('dir');
    return dirValue === 'rtl';
};
