export type TBlocklyEvents = {
    type: string;
    element: string;
    group: string;
    oldValue: string;
    blockId: string;
};

// Define Blockly types for consistent usage across the application
export interface BlocklyBlock {
    type: string;
    meta?: () => {
        display_name: string;
        description: string;
    };
    getFieldValue: (fieldName: string) => string;
    setFieldValue: (value: string, fieldName: string) => void;
    getChildByType: (type: string) => BlocklyBlock | null;
    getHeightWidth?: () => { width: number; height: number };
    getSvgRoot?: () => Element;
    moveBy?: (x: number, y: number) => void;
    removeSelect?: () => void;
    addSelect?: () => void;
    isDescendantOf?: (type: string) => boolean;
    category_?: string;
    isInFlyout?: boolean;
}

export interface BlocklyWorkspace {
    getAllBlocks: () => BlocklyBlock[];
    addChangeListener: (listener: (event: BlocklyEvent) => void) => void;
    removeChangeListener: (listener: (event: BlocklyEvent) => void) => void;
    render: () => void;
    RTL?: boolean;
    horizontalLayout?: boolean;
    options?: Record<string, unknown>;
    targetWorkspace?: ExtendedBlocklyWorkspace;
    getButtonCallback?: (callback_key: string | null) => ((event?: unknown) => void) | undefined;
    getToolboxCategoryCallback?: (category: string) => unknown;
    getVariablesOfType?: (type: string | null) => unknown[];
    getMetrics?: () => unknown;
    getVariableMap?: () => unknown;
    getGesture?: () => unknown;
    createPotentialVariableMap?: () => void;
    zoom?: (x: number, y: number, amount: number) => void;
    cleanUp?: (x?: number, y?: number) => void;
    undo?: (is_redo: boolean) => void;
    clearUndo?: () => void;
    asyncClear?: () => void;
    dispose?: () => void;
    svgBlockCanvas_?: Element;
    undoStack_?: unknown[];
    redoStack_?: unknown[];
    VariableMap?: unknown;
}

export interface BlocklyEvent {
    type: string;
    element?: string;
    name?: string;
    oldValue?: string;
    newValue?: string;
}

export interface BlocklyEvents {
    BlockChange: new (
        block: BlocklyBlock,
        element: string,
        name: string,
        oldValue: string,
        newValue: string
    ) => BlocklyEvent;
    fire: (event: BlocklyEvent) => void;
    setGroup: (group: string) => void;
    getGroup: () => string;
    UiBase?: unknown;
    BLOCK_CREATE?: string;
}

// Extended Blockly type definitions for XML manipulation, utilities, and workspace methods
export interface BlocklyXml {
    domToText: (dom: Element | Document) => string;
    domToBlock: (dom: Element, workspace: any) => any;
    domToWorkspace: (dom: Element | Document, workspace: any) => any;
    workspaceToDom: (workspace: any, opt_noId?: boolean) => Element;
    clearWorkspaceAndLoadFromXml: (dom: Element | Document, workspace: any) => void;
    domToPrettyText: (dom: Element | Document) => string;
    domToVariables: (dom: Element, workspace: any) => void;
    blockToDom: (block: any) => Element;
    textToDom: (text: string) => Document;
    NODE_BLOCK: string;
    NODE_LABEL: string;
    NODE_INPUT: string;
    NODE_BUTTON: string;
}

export interface BlocklyUtils {
    xml: {
        textToDom: (text: string) => Document;
    };
    idGenerator: {
        genUid: () => string;
    };
    genUid?: () => string;
    dom: {
        hasClass: (element: Element, className: string) => boolean;
        addClass: (element: Element, className: string) => void;
        removeClass: (element: Element, className: string) => void;
    };
    string: {
        wrap: (text: string, limit: number) => string;
    };
}

export interface ExtendedBlocklyWorkspace extends BlocklyWorkspace {
    addBlockNode: (blockNode: Element | null) => void;
    strategy_to_load?: string;
    current_strategy_id?: string;
    save_workspace_interval?: ReturnType<typeof setInterval>;
    isFlyoutVisible?: boolean;
    cached_xml?: {
        main: string;
    };
}

// Extend the Window interface to include Blockly types
declare global {
    interface Window {
        Blockly: {
            Blocks: Record<string, BlocklyBlock>;
            Block: {
                getDimensions: (node: Element) => { width: number; height: number };
            };
            derivWorkspace?: ExtendedBlocklyWorkspace;
            Events: BlocklyEvents;
            Xml: BlocklyXml;
            utils: BlocklyUtils;
            browserEvents?: {
                bind: (...args: any[]) => unknown;
                conditionalBind: (...args: any[]) => unknown;
                unbind: (listener: unknown) => void;
            };
            Options?: new (options: Record<string, unknown>) => unknown;
            HorizontalFlyout?: new (options: unknown) => any;
            VerticalFlyout?: new (options: unknown) => any;
            inject?: (element: HTMLElement, options: Record<string, unknown>) => any;
            svgResize?: (workspace: unknown) => void;
            DataCategory?: {
                flyoutCategoryBlocks: (workspace: ExtendedBlocklyWorkspace) => unknown[];
            };
            Procedures?: {
                flyoutCategory: (workspace: ExtendedBlocklyWorkspace) => unknown[];
            };
            Themes?: {
                zelos_renderer?: unknown;
            };
            Tooltip?: {
                LIMIT: number;
            };
            WorkspaceSvg?: any;
        };
    }
}
