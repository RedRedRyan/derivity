/**
 * Inspect the contents of the trash.
 * @deriv/bot: Noop for us, restore original functionality when trashcan can be inspected.
 */
window.Blockly.Trashcan.prototype.click = function () {};

const SVG_NS = 'http://www.w3.org/2000/svg';

const createSvgNode = (tag_name, attributes = {}) => {
    const node = document.createElementNS(SVG_NS, tag_name);

    Object.entries(attributes).forEach(([key, value]) => {
        node.setAttribute(key, String(value));
    });

    return node;
};

// Replaces Blockly's sprite-based trash image with the Quill trash icon path.
window.Blockly.Trashcan.prototype.createDom = function () {
    this.svgGroup = createSvgNode('g', {
        class: 'blocklyTrash',
    });

    const hit_area = createSvgNode('rect', {
        width: 47,
        height: 60,
        rx: 8,
        ry: 8,
        fill: 'transparent',
    });

    const icon_wrapper = createSvgNode('g', {
        transform: 'translate(7 9)',
    });

    const icon_background = createSvgNode('rect', {
        width: 32,
        height: 32,
        rx: 8,
        ry: 8,
        fill: '#101828',
        opacity: 0.9,
    });

    // Path sourced from StandaloneTrashRegularIcon in @deriv/quill-icons.
    const icon_path = createSvgNode('path', {
        d: 'M14.164 7.75a.61.61 0 0 0-.508.313L13.031 9h5.899l-.625-.937a.61.61 0 0 0-.508-.313zM20.375 9h3.75c.313 0 .625.313.625.625a.64.64 0 0 1-.625.625h-.742l-.977 13.945c-.117 1.328-1.172 2.305-2.5 2.305h-7.851a2.51 2.51 0 0 1-2.5-2.305L8.578 10.25h-.703a.617.617 0 0 1-.625-.625c0-.312.273-.625.625-.625h3.711l1.016-1.602a1.84 1.84 0 0 1 1.562-.898h3.633c.625 0 1.25.352 1.601.898zm1.758 1.25H9.828l.977 13.867c.039.625.586 1.133 1.25 1.133h7.851c.664 0 1.211-.508 1.25-1.133z',
        fill: '#ffffff',
    });

    icon_wrapper.appendChild(icon_background);
    icon_wrapper.appendChild(icon_path);
    this.svgGroup.appendChild(hit_area);
    this.svgGroup.appendChild(icon_wrapper);

    this.svgLid = icon_wrapper;

    window.Blockly.browserEvents.bind(this.svgGroup, 'pointerdown', this, this.blockMouseDownWhenOpenable);
    window.Blockly.browserEvents.bind(this.svgGroup, 'pointerup', this, this.click);
    window.Blockly.browserEvents.bind(this.svgGroup, 'pointerover', this, this.mouseOver);
    window.Blockly.browserEvents.bind(this.svgGroup, 'pointerout', this, this.mouseOut);

    this.animateLid();
    return this.svgGroup;
};

window.Blockly.Trashcan.prototype.setLidAngle = function () {};

window.Blockly.Trashcan.prototype.setTrashcanPosition = (position_right, position_top) => {
    const trashcan_instance = window.Blockly.derivWorkspace?.trashcan?.svgGroup;
    trashcan_instance?.setAttribute('transform', `translate(${position_right}, ${position_top})`);
};
