import { buildXmlImportDiagnosticsMessage, getParserErrorText, getUnsupportedXmlTags } from './xml-import-diagnostics';

describe('xml-import-diagnostics', () => {
    it('builds a detailed diagnostics message', () => {
        const message = buildXmlImportDiagnosticsMessage({
            parser_error_text: 'unexpected close tag',
            unsupported_tags: ['foo'],
            unsupported_block_types: ['smart_purchase_contract'],
        });

        expect(message).toContain('Parser error: unexpected close tag');
        expect(message).toContain('Unsupported XML elements: foo.');
        expect(message).toContain('Unsupported block types: smart_purchase_contract.');
    });

    it('extracts unsupported xml tags', () => {
        const xml_doc = new DOMParser().parseFromString(
            '<xml><block type="math_number"></block><foo></foo></xml>',
            'text/xml'
        );

        expect(getUnsupportedXmlTags(xml_doc)).toEqual(['foo']);
    });

    it('accepts Blockly data tags used by procedure call metadata', () => {
        const xml_doc = new DOMParser().parseFromString(
            '<xml><block type="procedures_callnoreturn"><data>meta</data></block></xml>',
            'text/xml'
        );

        expect(getUnsupportedXmlTags(xml_doc)).toEqual([]);
    });

    it('extracts parser error text when xml is malformed', () => {
        const xml_doc = new DOMParser().parseFromString('<xml><block></xml>', 'text/xml');

        expect(getParserErrorText(xml_doc)).toBeTruthy();
    });
});
