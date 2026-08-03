import { localize } from '@deriv-com/translations';

const SUPPORTED_XML_TAGS = new Set([
    'xml',
    'variables',
    'variable',
    'block',
    'field',
    'value',
    'shadow',
    'statement',
    'next',
    'mutation',
    'data',
    'sep',
    'comment',
]);

const normalizeWhitespace = (value?: string | null) => (value || '').replace(/\s+/g, ' ').trim();

const truncateList = (values: string[], max = 10) => {
    if (values.length <= max) return values;
    return [...values.slice(0, max), `+${values.length - max} more`];
};

export const getParserErrorText = (xml_doc: Document) => {
    const parser_error = xml_doc.querySelector('parsererror');
    return normalizeWhitespace(parser_error?.textContent);
};

export const getUnsupportedXmlTags = (xml_node: ParentNode | null | undefined) => {
    if (!xml_node?.querySelectorAll) return [];

    const unsupported_tags = new Set<string>();
    Array.from(xml_node.querySelectorAll('*')).forEach(node => {
        const tag_name = node.tagName?.toLowerCase();
        if (tag_name && !SUPPORTED_XML_TAGS.has(tag_name)) {
            unsupported_tags.add(tag_name);
        }
    });

    return Array.from(unsupported_tags).sort();
};

export const getUnsupportedBlocklyBlockTypes = (xml_node: ParentNode | null | undefined) => {
    if (!xml_node?.querySelectorAll || !window.Blockly?.Blocks) return [];

    const supported_block_types = new Set(Object.keys(window.Blockly.Blocks));
    const unsupported_block_types = new Set<string>();

    Array.from(xml_node.querySelectorAll('block, shadow')).forEach(block_node => {
        const block_type = block_node.getAttribute('type');
        if (block_type && !supported_block_types.has(block_type)) {
            unsupported_block_types.add(block_type);
        }
    });

    return Array.from(unsupported_block_types).sort();
};

type TXmlImportDiagnostics = {
    parser_error_text?: string;
    root_node_name?: string;
    unsupported_tags?: string[];
    unsupported_block_types?: string[];
    load_error_message?: string;
    no_blocks_found?: boolean;
};

export const buildXmlImportDiagnosticsMessage = ({
    parser_error_text,
    root_node_name,
    unsupported_tags = [],
    unsupported_block_types = [],
    load_error_message,
    no_blocks_found,
}: TXmlImportDiagnostics) => {
    const issues: string[] = [];

    if (parser_error_text) {
        issues.push(`${localize('Parser error')}: ${parser_error_text}`);
    }

    if (root_node_name && root_node_name !== 'xml') {
        issues.push(`${localize('Invalid root element')}: ${root_node_name}.`);
    }

    if (unsupported_tags.length) {
        issues.push(`${localize('Unsupported XML elements')}: ${truncateList(unsupported_tags).join(', ')}.`);
    }

    if (unsupported_block_types.length) {
        issues.push(`${localize('Unsupported block types')}: ${truncateList(unsupported_block_types).join(', ')}.`);
    }

    if (no_blocks_found) {
        issues.push(localize('No Blockly blocks were found in this XML file.'));
    }

    if (load_error_message) {
        issues.push(`${localize('Load error')}: ${normalizeWhitespace(load_error_message)}`);
    }

    if (!issues.length) {
        return localize('XML file contains unsupported elements. Please check or modify file.');
    }

    return `${localize('XML import failed')}. ${issues.join(' ')}`;
};
