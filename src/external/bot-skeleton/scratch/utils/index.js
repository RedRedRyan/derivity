import { botNotification } from '@/components/bot-notification/bot-notification';
import { notification_message } from '@/components/bot-notification/bot-notification-utils';
import { getCurrencyDisplayCode } from '@/components/shared';
import {
    buildXmlImportDiagnosticsMessage,
    getParserErrorText,
    getUnsupportedBlocklyBlockTypes,
    getUnsupportedXmlTags,
} from '@/utils/xml-import-diagnostics';
import { localize } from '@deriv-com/translations';
import { config } from '../../constants/config';
import { LogTypes } from '../../constants/messages';
import { error_message_map } from '../../utils/error-config';
import { saveWorkspaceToRecent } from '../../utils/local-storage';
import { observer as globalObserver } from '../../utils/observer';
import {
    getBlocksForRequiredType,
    getCanonicalRequiredBlockType,
    hasRequiredBlockType,
    isPurchaseBlockType,
    PURCHASE_BLOCK_TYPES,
} from '../../utils/required-blocks';
import { removeLimitedBlocks } from '../../utils/workspace';
import BlockConversion from '../backward-compatibility';
import DBotStore from '../dbot-store';
import { saveAs } from '../shared';

export const inject_workspace_options = {
    media: '/assets/media/',
    zoom: {
        wheel: true,
        startScale: config().workspaces.previewWorkspaceStartScale,
    },
    readOnly: true,
    scrollbars: true,
    renderer: 'zelos',
};

const sanitizeXmlString = xml_string => String(xml_string || '').replace(/^\uFEFF/, '');

export const updateXmlValues = blockly_options => {
    if (!window.Blockly) return;
    const { strategy_id, convertedDom, file_name, from } = blockly_options;
    window.Blockly.xmlValues = {
        ...window.Blockly.xmlValues,
        strategy_id,
        convertedDom,
        file_name,
        from,
    };
};

export const getSelectedTradeType = (workspace = window.Blockly.derivWorkspace) => {
    const trade_type_block = workspace.getAllBlocks(true).find(block => block.type === 'trade_definition_tradetype');
    const selected_trade_type = trade_type_block?.getFieldValue('TRADETYPE_LIST');
    let mandatory_tradeoptions_block = 'trade_definition_tradeoptions';
    if (selected_trade_type === 'multiplier') mandatory_tradeoptions_block = 'trade_definition_multiplier';
    if (selected_trade_type === 'accumulator') mandatory_tradeoptions_block = 'trade_definition_accumulator';
    return mandatory_tradeoptions_block;
};

export const matchTranslateAttribute = translateString => {
    const match = translateString.match(/translate\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/);
    if (match && match.length > 2) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        return { x, y };
    }
    return null; // Invalid or no match
};

export const extractTranslateValues = () => {
    const transform_value = window.Blockly?.derivWorkspace?.trashcan?.svgGroup.getAttribute('transform');
    const translate_xy = matchTranslateAttribute(transform_value);

    if (!translate_xy) {
        globalObserver.emit('Error', 'Invalid String');
    }

    return {
        translate_X: translate_xy.x,
        translate_Y: translate_xy.y,
    };
};

export const validateErrorOnBlockDelete = () => {
    // Get the bounding rectangle of the selected block
    const { translate_X, translate_Y } = extractTranslateValues();
    const blockRect = window.Blockly.getSelected()?.getSvgRoot().getBoundingClientRect();
    const translate_offset = 200;
    // Extract coordinates from the bounding rectangles
    const blockX = blockRect?.left || 0;
    const blockY = blockRect?.top || 0;
    const mandatory_trade_option_block = getSelectedTradeType();
    const required_block_types = [mandatory_trade_option_block, 'trade_definition', 'purchase', 'before_purchase'];
    const selected_block_type = window.Blockly?.getSelected()?.type;
    const canonical_block_type = getCanonicalRequiredBlockType(selected_block_type);
    if (required_block_types?.includes(canonical_block_type)) {
        if (
            blockY >= translate_Y - translate_offset &&
            blockY <= translate_Y + translate_offset &&
            blockX >= translate_X - translate_offset &&
            blockX <= translate_X + translate_offset
        ) {
            globalObserver.emit('ui.log.error', error_message_map?.()?.[canonical_block_type]?.default);
        }
    }
};

export const updateWorkspaceName = () => {
    if (!DBotStore?.instance) return;
    const { load_modal } = DBotStore.instance;
    const file_name = load_modal?.dashboard_strategies?.[0]?.name ?? config().default_file_name;
    if (document.title.indexOf('-') > -1) {
        const string_to_replace = document.title.substr(document.title.indexOf('-'));
        const new_document_title = document.title.replace(string_to_replace, `- ${file_name}`);

        document.title = new_document_title;
    } else {
        document.title += ` - ${file_name}`;
    }
};

export const isMainBlock = block_type => config().mainBlocks.indexOf(block_type) >= 0;

export const oppositesToDropdownOptions = opposite_name => {
    return opposite_name.map(contract_type => {
        // i.e. [['CALL', localize('Rise')]] becomes [[localize('Rise'), 'CALL']];
        return Object.entries(contract_type)[0].reverse();
    });
};

export const cleanUpOnLoad = (blocks_to_clean, drop_event, workspace) => {
    const { clientX = 0, clientY = 0 } = drop_event || {};
    const toolbar_height = 76;
    const blockly_metrics = workspace.getMetrics();
    const scale_cancellation = 1 / workspace.scale;
    const blockly_left = blockly_metrics.absoluteLeft - blockly_metrics.viewLeft;
    const blockly_top = document.body.offsetHeight - blockly_metrics.viewHeight - blockly_metrics.viewTop;
    const cursor_x = clientX ? (clientX - blockly_left) * scale_cancellation : 0;
    const cursor_y = clientY ? (clientY - blockly_top - toolbar_height) * scale_cancellation : 0;

    workspace.cleanUp(cursor_x, cursor_y, blocks_to_clean);
};

export const save = (filename = '@deriv/bot', collection = false, xmlDom) => {
    xmlDom.setAttribute('is_dbot', 'true');
    xmlDom.setAttribute('collection', collection ? 'true' : 'false');

    const data = window.Blockly.Xml.domToPrettyText(xmlDom);
    saveAs({ data, type: 'text/xml;charset=utf-8', filename: `${filename}.xml` });
};

const delayExecution = ms => new Promise(resolve => setTimeout(resolve, ms));

const blockTypeAliases = {
    after__purchase: 'after_purchase',
    before__purchase: 'before_purchase',
    contract__check__result: 'contract_check_result',
    during__purchase: 'during_purchase',
    logic__compare: 'logic_compare',
    math__arithmetic: 'math_arithmetic',
    math__numbers: 'math_number',
    text_statements: 'text_statement',
    trade__again: 'trade_again',
    trade__definition__restartbuysell: 'trade_definition_restartbuysell',
    trade__definition__tradeoptions: 'trade_definition_tradeoptions',
    variables__get: 'variables_get',
    variables__set: 'variables_set',
};

const normalizeBotBlockType = type => {
    if (!type) return type;

    const cleaned_type = String(type).trim();
    if (!cleaned_type) return cleaned_type;

    if (/^btnotify$/i.test(cleaned_type) || /^notify(?:[\s_-]|[a-z0-9])/i.test(cleaned_type)) return 'notify';
    if (/^purchase[\s_-]/i.test(cleaned_type)) return 'purchase';

    const collapsed_type = cleaned_type.replace(/__/g, '_').replace(/\s+/g, '_');
    return blockTypeAliases[cleaned_type] || blockTypeAliases[collapsed_type] || collapsed_type;
};

const createXmlElement = (xml, name) => (xml.ownerDocument || document).createElement(name);

const createFieldElement = (xml, name, text_content) => {
    const field = createXmlElement(xml, 'field');
    field.setAttribute('name', name);
    field.textContent = text_content;
    return field;
};

const getDirectChild = (node, child_name, attribute_name, attribute_value) =>
    Array.from(node?.children || []).find(child => {
        const is_matching_name = child.nodeName?.toLowerCase() === child_name;
        if (!is_matching_name) return false;
        if (!attribute_name) return true;
        return child.getAttribute(attribute_name) === attribute_value;
    });

const normalizePurchaseType = purchase_type => {
    const normalized_type = String(purchase_type || '')
        .trim()
        .toUpperCase();

    if (!normalized_type) return 'CALL';
    if (normalized_type.includes('CALL')) return 'CALL';
    if (normalized_type.includes('PUT')) return 'PUT';
    if (normalized_type.includes('DIGITMATCH')) return 'DIGITMATCH';
    if (normalized_type.includes('DIGITDIFF')) return 'DIGITDIFF';
    if (normalized_type.includes('DIGITEVEN')) return 'DIGITEVEN';
    if (normalized_type.includes('DIGITODD')) return 'DIGITODD';
    if (normalized_type.includes('DIGITOVER')) return 'DIGITOVER';
    if (normalized_type.includes('DIGITUNDER')) return 'DIGITUNDER';
    if (normalized_type.includes('MULTUP')) return 'MULTUP';
    if (normalized_type.includes('MULTDOWN')) return 'MULTDOWN';

    return normalized_type;
};

const inferDefaultPurchaseType = xml => {
    const existing_purchase_type = xml
        .querySelector('block[type="purchase"] field[name="PURCHASE_LIST"]')
        ?.textContent?.trim();
    if (existing_purchase_type) return normalizePurchaseType(existing_purchase_type);

    const selected_contract_type = xml
        .querySelector('block[type="trade_definition_contracttype"] field[name="TYPE_LIST"]')
        ?.textContent?.trim();
    if (selected_contract_type) return normalizePurchaseType(selected_contract_type);

    return 'CALL';
};

const createPurchaseBlock = (xml, purchase_type) => {
    const purchase_block = createXmlElement(xml, 'block');
    purchase_block.setAttribute('type', 'purchase');

    purchase_block.appendChild(createFieldElement(xml, 'PURCHASE_LIST', normalizePurchaseType(purchase_type)));

    return purchase_block;
};

const createTextBlock = (xml, text) => {
    const text_block = createXmlElement(xml, 'block');
    text_block.setAttribute('type', 'text');
    text_block.appendChild(createFieldElement(xml, 'TEXT', text));
    return text_block;
};

const createMathNumberBlock = (xml, value, type = 'math_number') => {
    const math_number_block = createXmlElement(xml, 'block');
    math_number_block.setAttribute('type', type);
    math_number_block.appendChild(createFieldElement(xml, 'NUM', String(value)));
    return math_number_block;
};

const createVariableGetBlock = (xml, variable_id, variable_name) => {
    const variables_get_block = createXmlElement(xml, 'block');
    variables_get_block.setAttribute('type', 'variables_get');

    const variable_field = createFieldElement(xml, 'VAR', variable_name);
    variable_field.setAttribute('id', variable_id);
    variables_get_block.appendChild(variable_field);

    return variables_get_block;
};

const createValueElement = (xml, name, value_block) => {
    const value = createXmlElement(xml, 'value');
    value.setAttribute('name', name);
    value.appendChild(value_block);
    return value;
};

const replaceNode = (target_node, replacement_node) => {
    const parent_node = target_node?.parentNode;
    if (!parent_node) return;
    parent_node.replaceChild(replacement_node, target_node);
};

const cloneValueBlock = value_node => {
    const child_blocks = Array.from(value_node?.children || []).filter(child =>
        ['block', 'shadow'].includes(child.nodeName?.toLowerCase())
    );
    const preferred_child =
        child_blocks.find(child => child.nodeName?.toLowerCase() === 'block') ||
        child_blocks.find(child => child.nodeName?.toLowerCase() === 'shadow');

    return preferred_child?.cloneNode(true);
};

const getTradeOptionsTemplateInputs = xml => {
    const trade_options_block = xml.querySelector('block[type="trade_definition_tradeoptions"]');
    const duration_value = getDirectChild(trade_options_block, 'value', 'name', 'DURATION');
    const amount_value = getDirectChild(trade_options_block, 'value', 'name', 'AMOUNT');
    const duration_type =
        trade_options_block?.querySelector('field[name="DURATIONTYPE_LIST"]')?.textContent?.trim() || 't';

    return {
        duration_type,
        duration_block: cloneValueBlock(duration_value) || createMathNumberBlock(xml, 1),
        amount_block: cloneValueBlock(amount_value) || createMathNumberBlock(xml, 1, 'math_number_positive'),
    };
};

const createOptionMutation = xml => {
    const mutation = createXmlElement(xml, 'mutation');
    mutation.setAttribute(
        'options',
        '%5B%5B%22Even%20Odd%22%2C%22Even%20Odd%22%5D%2C%5B%22Over4%2FUnder5%22%2C%22Over4%2FUnder5%22%5D%2C%5B%22Rise%2FFall%22%2C%22Rise%2FFall%22%5D%5D'
    );
    return mutation;
};

const createOptionCheckBlock = (xml, block_id, variable_id, option_text) => {
    const block = createXmlElement(xml, 'block');
    block.setAttribute('type', 'variables_is_option');
    block.setAttribute('id', block_id);
    block.appendChild(createOptionMutation(xml));
    const variable_field = createFieldElement(xml, 'VAR', 'TRADE TYPE');
    variable_field.setAttribute('id', variable_id);
    block.appendChild(variable_field);
    block.appendChild(createFieldElement(xml, 'OPTION', option_text));
    return block;
};

const createOptionSetBlock = (xml, block_id, variable_id, option_text) => {
    const block = createXmlElement(xml, 'block');
    block.setAttribute('type', 'variables_set_option');
    block.setAttribute('id', block_id);
    block.appendChild(createOptionMutation(xml));
    const variable_field = createFieldElement(xml, 'VAR', 'TRADE TYPE');
    variable_field.setAttribute('id', variable_id);
    block.appendChild(variable_field);
    block.appendChild(createFieldElement(xml, 'OPTION', option_text));
    return block;
};

const injectLegacyTradeTypeCycle = xml => {
    const reset_count_block = xml.querySelector('block[id="reset_count_after_switch"]');
    const trade_type_field = Array.from(xml.querySelectorAll('field[name="VAR"]')).find(
        field => field.textContent?.trim() === 'TRADE TYPE' && field.getAttribute('id')
    );

    if (!reset_count_block || !trade_type_field || xml.querySelector('block[id="set_trade_type_to_over_under"]')) {
        return;
    }

    const trade_type_var_id = trade_type_field.getAttribute('id');
    const cycle_block = createXmlElement(xml, 'block');
    cycle_block.setAttribute('type', 'controls_if');
    cycle_block.setAttribute('id', 'cycle_trade_type_after_switch');

    const mutation = createXmlElement(xml, 'mutation');
    mutation.setAttribute('elseif', '1');
    mutation.setAttribute('else', '1');
    cycle_block.appendChild(mutation);

    cycle_block.appendChild(
        createValueElement(
            xml,
            'IF0',
            createOptionCheckBlock(xml, 'is_even_odd_trade_type', trade_type_var_id, 'Even Odd')
        )
    );

    const do0 = createXmlElement(xml, 'statement');
    do0.setAttribute('name', 'DO0');
    do0.appendChild(createOptionSetBlock(xml, 'set_trade_type_to_over_under', trade_type_var_id, 'Over4/Under5'));
    cycle_block.appendChild(do0);

    cycle_block.appendChild(
        createValueElement(
            xml,
            'IF1',
            createOptionCheckBlock(xml, 'is_over_under_trade_type', trade_type_var_id, 'Over4/Under5')
        )
    );

    const do1 = createXmlElement(xml, 'statement');
    do1.setAttribute('name', 'DO1');
    do1.appendChild(createOptionSetBlock(xml, 'set_trade_type_to_rise_fall', trade_type_var_id, 'Rise/Fall'));
    cycle_block.appendChild(do1);

    const else_statement = createXmlElement(xml, 'statement');
    else_statement.setAttribute('name', 'ELSE');
    else_statement.appendChild(
        createOptionSetBlock(xml, 'reset_trade_type_to_even_odd', trade_type_var_id, 'Even Odd')
    );
    cycle_block.appendChild(else_statement);

    const next = createXmlElement(xml, 'next');
    next.appendChild(reset_count_block.cloneNode(true));
    cycle_block.appendChild(next);

    replaceNode(reset_count_block, cycle_block);
};

const normalizeOptionVariableBlocks = xml => {
    Array.from(xml.querySelectorAll('block[type="variables_set_option"]')).forEach(block_node => {
        const option_text = block_node.querySelector('field[name="OPTION"]')?.textContent?.trim() || '';
        const next_node = getDirectChild(block_node, 'next');

        block_node.setAttribute('type', 'variables_set');
        Array.from(block_node.children).forEach(child_node => {
            const tag_name = child_node.nodeName?.toLowerCase();
            const field_name = child_node.getAttribute?.('name');
            const should_keep = tag_name === 'field' && field_name === 'VAR';
            if (!should_keep && child_node !== next_node) {
                block_node.removeChild(child_node);
            }
        });

        const value = createValueElement(xml, 'VALUE', createTextBlock(xml, option_text));
        if (next_node) {
            block_node.insertBefore(value, next_node);
        } else {
            block_node.appendChild(value);
        }
    });

    Array.from(xml.querySelectorAll('block[type="variables_is_option"]')).forEach(block_node => {
        const option_text = block_node.querySelector('field[name="OPTION"]')?.textContent?.trim() || '';
        const variable_field = block_node.querySelector('field[name="VAR"]');
        const variable_id = variable_field?.getAttribute('id') || '';
        const variable_name = variable_field?.textContent?.trim() || '';

        block_node.setAttribute('type', 'logic_compare');
        while (block_node.firstChild) {
            block_node.removeChild(block_node.firstChild);
        }

        block_node.appendChild(createFieldElement(xml, 'OP', 'EQ'));
        block_node.appendChild(createValueElement(xml, 'A', createVariableGetBlock(xml, variable_id, variable_name)));
        block_node.appendChild(createValueElement(xml, 'B', createTextBlock(xml, option_text)));
    });
};

const normalizeApolloPurchaseBlocks = xml => {
    const apollo_purchase_blocks = Array.from(xml.querySelectorAll('block[type="apollo_purchase2"]'));
    if (!apollo_purchase_blocks.length) return;

    const { duration_type, duration_block, amount_block } = getTradeOptionsTemplateInputs(xml);

    apollo_purchase_blocks.forEach(block_node => {
        const purchase_type = block_node.querySelector('field[name="PURCHASE_LIST"]')?.textContent?.trim() || 'CALL';
        const prediction_value = getDirectChild(block_node, 'value', 'name', 'PREDICTION');
        const next_node = getDirectChild(block_node, 'next');
        const smart_purchase_block = createXmlElement(xml, 'block');
        smart_purchase_block.setAttribute('type', 'smart_purchase_contract');
        const block_id = block_node.getAttribute('id');
        if (block_id) smart_purchase_block.setAttribute('id', block_id);

        smart_purchase_block.appendChild(
            createValueElement(xml, 'CONTRACT_TYPE', createTextBlock(xml, normalizePurchaseType(purchase_type)))
        );
        smart_purchase_block.appendChild(createValueElement(xml, 'AMOUNT', amount_block.cloneNode(true)));
        smart_purchase_block.appendChild(createValueElement(xml, 'DURATION', duration_block.cloneNode(true)));
        smart_purchase_block.appendChild(createFieldElement(xml, 'DURATIONTYPE_LIST', duration_type));
        smart_purchase_block.appendChild(
            createValueElement(
                xml,
                'PREDICTION',
                cloneValueBlock(prediction_value) || createMathNumberBlock(xml, 0, 'math_number_positive')
            )
        );
        smart_purchase_block.appendChild(createValueElement(xml, 'RECOVERY_AFTER', createMathNumberBlock(xml, 999999)));

        if (next_node) {
            smart_purchase_block.appendChild(next_node.cloneNode(true));
        }

        replaceNode(block_node, smart_purchase_block);
    });
};

const PURCHASE_BLOCK_SELECTOR = PURCHASE_BLOCK_TYPES.map(block_type => `block[type="${block_type}"]`).join(', ');

const appendBlockToStatement = (xml, statement, block) => {
    const first_block = getDirectChild(statement, 'block');

    if (!first_block) {
        statement.appendChild(block);
        return;
    }

    let current_block = first_block;
    let next_node = getDirectChild(current_block, 'next');
    while (next_node && getDirectChild(next_node, 'block')) {
        current_block = getDirectChild(next_node, 'block');
        next_node = getDirectChild(current_block, 'next');
    }

    if (!next_node) {
        next_node = createXmlElement(xml, 'next');
        current_block.appendChild(next_node);
    }
    next_node.appendChild(block);
};

const ensureMandatoryPurchaseCondition = xml => {
    if (!xml?.querySelectorAll) return xml;

    const root = xml.nodeType === 9 ? xml.documentElement : xml;
    if (root?.nodeName?.toLowerCase() !== 'xml') return xml;

    Array.from(xml.querySelectorAll(`block[type="before_purchase"], ${PURCHASE_BLOCK_SELECTOR}`)).forEach(block_node =>
        block_node.removeAttribute('disabled')
    );

    let before_purchase_block = xml.querySelector('block[type="before_purchase"]');
    if (!before_purchase_block) {
        before_purchase_block = createXmlElement(xml, 'block');
        before_purchase_block.setAttribute('type', 'before_purchase');
        before_purchase_block.setAttribute('x', '0');
        before_purchase_block.setAttribute('y', '260');
        root.appendChild(before_purchase_block);
    }

    const has_purchase_inside_before_purchase = Array.from(before_purchase_block.querySelectorAll('block')).some(
        block_node => isPurchaseBlockType(block_node.getAttribute('type'))
    );
    if (has_purchase_inside_before_purchase) return xml;

    let purchase_statement = getDirectChild(before_purchase_block, 'statement', 'name', 'BEFOREPURCHASE_STACK');
    if (!purchase_statement) {
        purchase_statement = createXmlElement(xml, 'statement');
        purchase_statement.setAttribute('name', 'BEFOREPURCHASE_STACK');
        before_purchase_block.appendChild(purchase_statement);
    }

    appendBlockToStatement(xml, purchase_statement, createPurchaseBlock(xml, inferDefaultPurchaseType(xml)));
    return xml;
};

export const normalizeBotXml = xml => {
    if (!xml?.querySelectorAll) return xml;

    const root = xml.nodeType === 9 ? xml.documentElement : xml;
    if (root?.nodeName?.toLowerCase() === 'xml') {
        if (!root.getAttribute('xmlns')) root.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
        if (!root.hasAttribute('collection')) root.setAttribute('collection', 'false');
    }

    Array.from(xml.querySelectorAll('block, shadow')).forEach(block_node => {
        const normalized_type = normalizeBotBlockType(block_node.getAttribute('type'));
        if (normalized_type) block_node.setAttribute('type', normalized_type);
    });

    injectLegacyTradeTypeCycle(xml);
    normalizeOptionVariableBlocks(xml);
    normalizeApolloPurchaseBlocks(xml);

    const has_modern_dbot_blocks = Boolean(
        xml.querySelector(
            `block[type="trade_definition"], block[type="before_purchase"], ${PURCHASE_BLOCK_SELECTOR}, block[type="after_purchase"], block[type="trade_again"]`
        )
    );
    const has_legacy_binary_blocks = Boolean(xml.querySelector('block[type="trade"], block[type="tradeOptions"]'));

    if (
        root?.nodeName?.toLowerCase() === 'xml' &&
        has_modern_dbot_blocks &&
        !has_legacy_binary_blocks &&
        root.getAttribute('is_dbot') !== 'true'
    ) {
        root.setAttribute('is_dbot', 'true');
    }

    ensureMandatoryPurchaseCondition(xml);

    return xml;
};

const removeXmlNodeSafely = node => {
    if (!node?.parentNode) return;

    const parent = node.parentNode;
    const parent_name = parent.nodeName?.toLowerCase();
    const wrapper_names = ['next', 'statement', 'value'];

    if (wrapper_names.includes(parent_name) && parent.parentNode) {
        parent.parentNode.removeChild(parent);
        return;
    }

    parent.removeChild(node);
};

const pruneUnsupportedBlocks = xml => {
    if (!xml?.querySelectorAll || !window.Blockly?.Blocks) return 0;

    let removed_count = 0;
    const block_nodes = Array.from(xml.querySelectorAll('block, shadow')).reverse();

    block_nodes.forEach(block_node => {
        const block_type = block_node.getAttribute('type');
        if (block_type && !Object.keys(window.Blockly.Blocks).includes(block_type)) {
            removeXmlNodeSafely(block_node);
            removed_count++;
        }
    });

    return removed_count;
};

export const load = async ({
    block_string,
    drop_event,
    file_name,
    strategy_id,
    from,
    workspace,
    showIncompatibleStrategyDialog,
    show_snackbar = true,
}) => {
    if (!DBotStore?.instance || !workspace) return;
    const { setLoading, load_modal } = DBotStore.instance;
    const { setOpenButtonDisabled, setLoadedLocalFile } = load_modal;

    setLoading(true);
    // Delay execution to allow fully previewing previous strategy if users quickly switch between strategies.
    await delayExecution(100);
    const showInvalidStrategyError = diagnostics => {
        setLoadedLocalFile(null);
        const error_message = buildXmlImportDiagnosticsMessage(diagnostics || {});
        botNotification(error_message);
        setLoading(false);
        globalObserver.emit('ui.log.error', error_message);
        return {
            error: error_message,
        };
    };

    const sanitized_block_string = sanitizeXmlString(block_string);

    if (typeof sanitized_block_string !== 'string' || !sanitized_block_string.trim()) {
        return showInvalidStrategyError({
            load_error_message: 'The XML file is empty or its text content could not be read.',
        });
    }

    // Check if XML can be parsed correctly.
    try {
        const xmlDoc = new DOMParser().parseFromString(sanitized_block_string, 'application/xml');
        if (xmlDoc.getElementsByTagName('parsererror').length) {
            return showInvalidStrategyError({
                parser_error_text: getParserErrorText(xmlDoc),
                root_node_name: xmlDoc.documentElement?.nodeName,
            });
        } else {
            show_snackbar && botNotification(notification_message().BOT_IMPORT);
        }
    } catch (e) {
        return showInvalidStrategyError({ load_error_message: e?.message });
    }

    let xml;
    // Check if XML can be parsed into a strategy.
    try {
        xml = window.Blockly.utils.xml.textToDom(sanitized_block_string);
        xml = normalizeBotXml(xml);
    } catch (e) {
        return showInvalidStrategyError({ load_error_message: e?.message });
    }
    const blockConversion = new BlockConversion();
    xml = blockConversion.convertStrategy(xml, showIncompatibleStrategyDialog);
    const unsupported_xml_tags_before_prune = getUnsupportedXmlTags(xml);
    const unsupported_block_types_before_prune = getUnsupportedBlocklyBlockTypes(xml);
    const pruned_blocks_count = pruneUnsupportedBlocks(xml);
    if (pruned_blocks_count > 0 || unsupported_xml_tags_before_prune.length) {
        globalObserver.emit(
            'ui.log.warn',
            buildXmlImportDiagnosticsMessage({
                unsupported_tags: unsupported_xml_tags_before_prune,
                unsupported_block_types: unsupported_block_types_before_prune,
            })
        );
    }
    const blockly_xml = xml.querySelectorAll('block');

    // Check if there are any blocks in this strategy.
    if (!blockly_xml.length) {
        return showInvalidStrategyError({
            unsupported_tags: unsupported_xml_tags_before_prune,
            unsupported_block_types: unsupported_block_types_before_prune,
            no_blocks_found: true,
        });
    }

    // Check if all block types in XML are allowed.
    const unsupported_xml_tags = getUnsupportedXmlTags(xml);
    const unsupported_block_types = getUnsupportedBlocklyBlockTypes(xml);
    if (unsupported_xml_tags.length || unsupported_block_types.length) {
        return showInvalidStrategyError({
            unsupported_tags: unsupported_xml_tags,
            unsupported_block_types,
        });
    }

    try {
        const is_collection = xml.hasAttribute('collection') && xml.getAttribute('collection') === 'true';
        const event_group = is_collection ? `load_collection${Date.now()}` : `dbot-load${Date.now()}`;
        window.Blockly.Events.setGroup(event_group);
        removeLimitedBlocks(
            workspace,
            Array.from(blockly_xml).map(xml_block => xml_block.getAttribute('type'))
        );
        updateXmlValues({ strategy_id, convertedDom: xml, file_name, from });
        if (is_collection) {
            loadBlocks(xml, drop_event, event_group, workspace);
        } else {
            await loadWorkspace(xml, event_group, workspace);

            const is_main_workspace = workspace === window.Blockly.derivWorkspace;
            if (is_main_workspace) {
                const { save_modal } = DBotStore.instance;

                save_modal.updateBotName(file_name);
                workspace.clearUndo();
                workspace.current_strategy_id = strategy_id || window.Blockly.utils.idGenerator.genUid();
                await saveWorkspaceToRecent(xml, from);
            }
        }

        // Set user disabled state on all disabled blocks. This ensures we don't change the disabled
        // state through code, which was implemented for user experience.
        workspace.getAllBlocks().forEach(block => {
            if (block.disabled) {
                block.is_user_disabled_state = true;
            }
        });
        if (workspace === window.Blockly.derivWorkspace) {
            globalObserver.emit('ui.log.success', { log_type: LogTypes.LOAD_BLOCK });
        }
    } catch (e) {
        console.error(e); // eslint-disable-line
        return showInvalidStrategyError({ load_error_message: e?.message });
    } finally {
        setLoading(false);
        setOpenButtonDisabled(false);
    }

    return { success: true };
};

export const loadBlocks = (xml, drop_event, event_group, workspace) => {
    window.Blockly.Events.setGroup(event_group);

    const block_ids = window.Blockly.Xml.domToWorkspace(xml, workspace);
    const added_blocks = block_ids.map(block_id => workspace.getBlockById(block_id));

    if (drop_event && Object.keys(drop_event).length !== 0) {
        cleanUpOnLoad(added_blocks, drop_event, workspace);
    } else {
        workspace.cleanUp();
    }
};

export const loadWorkspace = async (xml, event_group, workspace) => {
    window.Blockly.Events.setGroup(event_group);
    await workspace.asyncClear();
    window.Blockly.Xml.clearWorkspaceAndLoadFromXml(xml, workspace);
    workspace.cleanUp();
};

const loadBlocksFromHeader = (xml_string, block) => {
    // eslint-disable-next-line consistent-return
    return new Promise((resolve, reject) => {
        let xml;

        try {
            xml = window.Blockly.utils.xml.textToDom(sanitizeXmlString(xml_string));
        } catch (error) {
            return reject(localize('Unrecognized file format'));
        }

        try {
            const is_collection = xml.hasAttribute('collection') && xml.getAttribute('collection') === 'true';

            if (!is_collection) {
                reject(localize('Remote blocks to load must be a collection.'));
            }

            addLoaderBlocksFirst(xml)
                .then(() => {
                    Array.from(xml.children).forEach(el_block => addDomAsBlock(el_block, block));
                    resolve();
                })
                .catch(() => {
                    reject();
                });
        } catch (e) {
            reject(localize('Unable to load the block file.'));
        }
    });
};

export const loadBlocksFromRemote = block => {
    // eslint-disable-next-line consistent-return
    return new Promise((resolve, reject) => {
        let url = block.getFieldValue('URL');

        if (url.indexOf('http') === -1) {
            url = `http://${url}`;
        }

        const url_pattern = /[^/]*\.[a-zA-Z]{3}$/;
        const has_possible_missing_index_xml = url.slice(-1)[0] === '/';

        if (!url.match(url_pattern) && !has_possible_missing_index_xml) {
            return reject(localize('Target must be an XML file'));
        }

        if (has_possible_missing_index_xml) {
            url += 'index.xml';
        }

        if (block.isKnownUrl(url)) {
            block.setDisabled(true);
            return reject(localize('This URL is already loaded'));
        }

        const onFetchError = () => reject(localize('An error occured while trying to load the URL'));

        fetch(url)
            .then(response => {
                if (response.ok) {
                    response.text().then(xml_string => {
                        loadBlocksFromHeader(xml_string, block)
                            .then(() => resolve(block))
                            .catch(onFetchError);
                    });
                } else {
                    onFetchError();
                }
            })
            .catch(onFetchError);
    });
};

export const addLoaderBlocksFirst = xml => {
    return new Promise((resolve, reject) => {
        const promises = [];

        Array.from(xml.children).forEach(el_block => {
            const block_type = el_block.getAttribute('type');

            if (block_type === 'loader') {
                el_block.remove();
                const loader = window.Blockly.Xml.domToBlock(el_block, window.Blockly.derivWorkspace);
                promises.push(loadBlocksFromRemote(loader)); // eslint-disable-line no-use-before-define
            }
        });

        if (promises.length) {
            Promise.all(promises).then(resolve, reject);
        } else {
            resolve([]);
        }
    });
};

export const addDomAsBlock = (el_block, parent_block = null) => {
    if (el_block.tagName.toLowerCase() === 'variables') {
        return window.Blockly.Xml.domToVariables(el_block, window.Blockly.derivWorkspace);
    }

    const block_type = el_block.getAttribute('type');
    const block_conversion = new BlockConversion();
    const block_xml = window.Blockly.Xml.blockToDom(block_conversion.convertBlockNode(el_block));

    // Fix legacy Blockly `varid` attribute.
    Array.from(block_xml.getElementsByTagName('arg')).forEach(el => {
        if (el.hasAttribute('varid')) {
            el.setAttribute('varId', el.getAttribute('varid'));
        }
    });

    removeLimitedBlocks(window.Blockly.derivWorkspace, block_type);

    const block = window.Blockly.Xml.domToBlock(block_xml, window.Blockly.derivWorkspace);

    if (parent_block) {
        parent_block.blocks_added_by_me.push(block);
    }

    return block;
};

const getMissingBlocks = (workspace, required_block_types) => {
    const blocks = workspace.getAllBlocks();
    return required_block_types.filter(block_type => !hasRequiredBlockType(blocks, block_type));
};

const getDisabledBlocks = (workspace, required_block_types) =>
    required_block_types.flatMap(required_block_type => {
        const matching_blocks = getBlocksForRequiredType(workspace.getAllBlocks(), required_block_type);
        if (!matching_blocks.length || matching_blocks.some(block => !block.disabled)) return [];
        return [matching_blocks[0]];
    });

const throwNewErrorMessage = (error_blocks, key) => {
    return error_blocks.forEach(block => {
        const block_type = getCanonicalRequiredBlockType(block?.type || block);
        if (key === 'misplaced' && block)
            globalObserver.emit('ui.log.error', error_message_map?.()?.[block_type]?.[key]);
        else if (key === 'missing' && block)
            globalObserver.emit('ui.log.error', error_message_map?.()?.[block_type]?.[key]);
        else if (key === 'disabled' && block) {
            let parent_block_error = false;
            const parent_error_message = error_message_map?.()?.[block_type]?.[key];
            if (block.disabled && parent_error_message) {
                globalObserver.emit('ui.log.error', parent_error_message);
                parent_block_error = true;
            } else if (!parent_block_error && block.childBlocks_) {
                block.childBlocks_.forEach(childBlock => {
                    const child_error_message = error_message_map?.()?.[childBlock.type]?.[key];
                    if (child_error_message) globalObserver.emit('ui.log.error', child_error_message);
                });
            }
        }
    });
};

export const isAllRequiredBlocksEnabled = workspace => {
    if (!workspace) return false;

    const mandatory_trade_option_block = getSelectedTradeType(workspace);
    const { mandatoryMainBlocks } = config();
    const required_block_types = [mandatory_trade_option_block, ...mandatoryMainBlocks];

    const missing_blocks = getMissingBlocks(workspace, required_block_types);
    const disabled_blocks = getDisabledBlocks(workspace, required_block_types);

    if (missing_blocks) throwNewErrorMessage(missing_blocks, 'missing');
    if (disabled_blocks) throwNewErrorMessage(disabled_blocks, 'disabled');

    const error_blocks = [...missing_blocks, ...disabled_blocks];
    const blocks_required = error_blocks.length === 0;

    return blocks_required;
};

export const scrollWorkspace = (workspace, scroll_amount, is_horizontal, is_chronological) => {
    const ws_metrics = workspace.getMetrics();
    let scroll_x = ws_metrics.viewLeft - ws_metrics.scrollLeft;
    const delta_y = ws_metrics.viewTop - ws_metrics.scrollTop;
    let scroll_y = delta_y;
    if (is_horizontal) {
        scroll_x += is_chronological ? scroll_amount : -scroll_amount;
        if (!DBotStore.instance.is_mobile) {
            scroll_y += -20;
        }
    } else {
        scroll_x += -20;
        scroll_y += is_chronological ? scroll_amount : -scroll_amount;
    }
    const is_RTL = workspace.RTL;
    if (is_RTL) {
        // For RTL scroll we need to adjust the scroll amount
        scroll_x = scroll_amount;
        // Adjust scroll_y to prevent scrolling vertically on every render
        const toolbox_top = document.getElementById('gtm-toolbox')?.getBoundingClientRect()?.top;
        const block_canvas_rect_top = workspace.svgBlockCanvas_?.getBoundingClientRect()?.top;
        if (block_canvas_rect_top > toolbox_top) {
            scroll_y = delta_y;
        }

        /* NOTE: This was done for mobile view since 
        when we try to calculate the scroll amount for RTL,
        we need to realign the scroll to(0, 0) for the workspace.
        Then, from the width of the canvas, we need to subtract the width of the block. 
        To Make the block visible in the view width
        */

        if (window.innerWidth < 768) {
            workspace?.scrollbar?.set(0, scroll_y);
            const calc_scroll =
                workspace.svgBlockCanvas_?.getBoundingClientRect().width -
                workspace.svgBlockCanvas_?.getBoundingClientRect().left +
                60;
            workspace?.scrollbar?.set(calc_scroll, scroll_y);
            return;
        }
    }
    workspace?.scrollbar?.set(scroll_x, scroll_y);
};

/**
 * Sets the window.Blockly.Events.group_ and executes the passed callBackFn. Mainly
 * used to ensure undo/redo actions are executed correctly.
 * @param {Boolean} use_existing_group Uses the existing event group if true.
 * @param {Function} callbackFn Logic to execute as part of this event group.
 */
export const runGroupedEvents = (use_existing_group, callbackFn, opt_group_name) => {
    const group = (use_existing_group && window.Blockly.Events.getGroup()) || opt_group_name || true;

    window.Blockly.Events.setGroup(group);
    callbackFn();

    if (!use_existing_group) {
        window.Blockly.Events.setGroup(false);
    }
};

/**
 * Sets the recordUndo flag to "false" globally, this will ensure any events
 * happening as part of the callbackFn logic cannot be undone.
 * @param {*} callbackFn Logic to execute as part of this event group.
 */
export const runIrreversibleEvents = callbackFn => {
    const { recordUndo } = window.Blockly.Events;
    window.Blockly.Events.setRecordUndo(false);

    callbackFn();

    window.Blockly.Events.setRecordUndo(recordUndo ?? true);
};

/**
 * Disables Blockly Events globally and runs the passed callbackFn.
 * (Preference should be given to runIrreversibleEvents).
 * @param {*} callbackFn Logic to completely hide from Blockly
 */
export const runInvisibleEvents = callbackFn => {
    window.Blockly.Events.disable();
    callbackFn();
    window.Blockly.Events.enable();
};

export const updateDisabledBlocks = (workspace, event) => {
    if (event.type === window.Blockly.Events.BLOCK_DRAG && !event.isStart) {
        workspace.getAllBlocks().forEach(block => {
            if (!block.getParent() || block.is_user_disabled_state) {
                return;
            }

            const restricted_parents = block.restricted_parents || [];
            if (restricted_parents.length === 0) {
                return;
            }

            const should_disable = !restricted_parents.some(restricted_parent =>
                block.isDescendantOf(restricted_parent)
            );

            runGroupedEvents(
                true,
                () => {
                    block.setDisabled(should_disable);
                },
                event.group
            );

            window.Blockly.Events.setGroup(false);
        });
    }
};

export const emptyTextValidator = input => {
    return !input || input === "''";
};

/* eslint-disable no-bitwise */
export const isDarkRgbColour = string_rgb => {
    const values = string_rgb.substring(1);
    const rgb = parseInt(values, 16);
    const red = (rgb >> 16) & 0xff;
    const green = (rgb >> 8) & 0xff;
    const blue = (rgb >> 0) & 0xff;
    const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    return luma < 160;
};
/* eslint-enable */

export const removeExtraInput = instance => {
    const collapsed_input = instance.getInput('_TEMP_COLLAPSED_INPUT');
    const procedures_array = ['procedures_defreturn', 'procedures_defnoreturn'];
    if (collapsed_input && instance.collapsed_ && !collapsed_input.icon_added) {
        collapsed_input.icon_added = true;
        const dropdown_path = `${instance.workspace.options.pathToMedia}dropdown-arrow.svg`;
        const field_expand_icon = new window.Blockly.FieldImage(dropdown_path, 16, 16, localize('Collapsed'), () =>
            instance.setCollapsed(false)
        );
        const function_name = instance.getFieldValue('NAME');
        const args = ` (${instance?.arguments?.join(', ')})`;

        if (procedures_array.includes(instance.type)) {
            collapsed_input
                .appendField(new window.Blockly.FieldLabel(localize('function'), ''))
                .appendField(new window.Blockly.FieldLabel(function_name + args, 'header__title'))
                .appendField(field_expand_icon);
        } else {
            collapsed_input.appendField(field_expand_icon);
        }

        const remove_last_input = dummy_input => {
            const tmp_array = dummy_input.fieldRow;

            const value_input = procedures_array.includes(instance.type) ? 0 : 2;
            if (!procedures_array.includes(instance.type)) {
                tmp_array[0]?.setClass('blocklyTextRootBlockHeader');
            }
            tmp_array[value_input]?.setVisible(false);
            tmp_array[value_input]?.forceRerender();
        };
        remove_last_input(collapsed_input);
    }
};

const downloadBlock = () => {
    const xml_block = window.Blockly?.getSelected()?.svgGroup_;
    const xml_text = window.Blockly.Xml.domToPrettyText(xml_block);
    saveAs({ data: xml_text, type: 'text/xml;charset=utf-8', filename: 'block.xml' });
};

const download_option = () => ({
    text: localize('Download Block'),
    enabled: true,
    callback: downloadBlock,
});

export const excludeOptionFromContextMenu = (menu, exclude_items) => {
    for (let i = 0; i <= menu.length - 1; i++) {
        const menu_text = localize(menu[i].text);
        if (exclude_items.includes(menu_text)) {
            menu.splice(i, 1);
        } else {
            menu[i].text = menu_text;
        }
    }
};

const all_context_menu_options = () => [
    localize('Duplicate'),
    localize('Add Comment'),
    localize('Remove Comment'),
    localize('Collapse Block'),
    localize('Expand Block'),
    localize('Disable Block'),
    localize('Enable Block'),
    localize('Download Block'),
];

const deleteBlocksLocaleText = () => localize('Delete Block');
const deleteAllBlocksLocaleText = () => localize('Delete All Blocks');

export const modifyContextMenu = (menu, add_new_items = []) => {
    const common_included_items = [download_option()];
    const include_items = [...common_included_items, ...add_new_items];
    include_items.forEach(item => {
        menu.push({
            text: item.text,
            enabled: item.enabled,
            callback: item.callback,
        });
    });

    for (let i = 0; i < menu.length; i++) {
        const menu_text = menu[i]?.text?.toLowerCase();
        if (menu_text?.includes('delete')) {
            if (menu_text.includes('block') && !menu_text.includes('blocks')) {
                menu[i].text = deleteBlocksLocaleText();
            } else {
                menu[i].text = deleteAllBlocksLocaleText();
            }
        } else {
            const localized_text = localize(menu[i].text);
            if (all_context_menu_options().includes(localized_text)) {
                menu[i].text = localized_text;
            }
        }
    }
};

export const evaluateExpression = value => {
    if (!value) return 'invalid_input';
    try {
        // eslint-disable-next-line no-new-func
        const result = new Function(`return ${value.trim()}`)();
        return isNaN(result) ? 'invalid_input' : result;
    } catch (e) {
        return 'invalid_input';
    }
};

export const appendCollapsedMainBlocksFields = block_instance => {
    try {
        // Return if the block is not collapsed
        if (!block_instance?.collapsed_) return;
        const type_of_block = block_instance?.getField(block_instance.type);
        if (type_of_block) return;

        const [block_image, block_name] = block_instance?.inputList?.[0]?.fieldRow.map(field => field.value_) || [];
        const collapsed_field = block_instance?.getField(Blockly.constants.COLLAPSED_FIELD_NAME);
        const collapsed_input = block_instance?.getInput(Blockly.constants.COLLAPSED_INPUT_NAME);

        // Initialize the icon_added property if not already done
        if (collapsed_input && collapsed_field) {
            // Add the image and label fields
            collapsed_input.appendField(new Blockly.FieldImage(block_image, 25, 25, '', ''));
            collapsed_input.appendField(new Blockly.FieldLabel(block_name, 'blocklyTextRootBlockHeaderCollapsed'));

            // Add the dropdown icon
            const dropdown_path = `${block_instance?.workspace.options.pathToMedia}dropdown-arrow.svg`;
            const field_expand_icon = new Blockly.FieldImage(dropdown_path, 16, 16, localize('Collapsed'), () =>
                block_instance?.setCollapsed(false)
            );
            collapsed_input.appendField(field_expand_icon, block_instance.type);
            collapsed_input.sourceBlock.width = 300;
            // hide the default collapsed field generated by Blockly
            collapsed_field.setVisible(false);
        }
    } catch (e) {
        globalObserver.emit('ui.log.error', e);
    }
};

export const appendCollapsedProcedureBlocksFields = instance => {
    const collapsed_input = instance.getInput('_TEMP_COLLAPSED_INPUT');
    if (collapsed_input && instance.collapsed_ && !collapsed_input.icon_added) {
        collapsed_input.icon_added = true;
        const dropdown_path = `${instance.workspace.options.pathToMedia}dropdown-arrow.svg`;
        const field_expand_icon = new Blockly.FieldImage(dropdown_path, 16, 16, localize('Collapsed'), () =>
            instance.setCollapsed(false)
        );
        const function_name = instance.getFieldValue('NAME');
        const args = ` (${instance?.arguments?.join(', ')})`;

        collapsed_input
            .appendField(new Blockly.FieldLabel(localize('function'), ''))
            .appendField(new Blockly.FieldLabel(function_name + args, 'header__title'))
            .appendField(field_expand_icon);

        const remove_last_input = dummy_input => {
            const tmp_array = dummy_input.fieldRow;
            tmp_array[0]?.setVisible(false);
            tmp_array[0]?.forceRerender();
        };
        remove_last_input(collapsed_input);
    }
};

export const setCurrency = block_instance => {
    if (!DBotStore?.instance?.client) return;
    const currency_field = block_instance.getField('CURRENCY_LIST');
    const { currency } = DBotStore.instance.client;
    currency_field?.setValue(getCurrencyDisplayCode(currency));
};
