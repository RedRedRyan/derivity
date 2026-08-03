type TGoogBaseCallable = {
    apply: (context: object, args: unknown[]) => unknown;
};

type TGoogPrototype = {
    [key: string]: TGoogBaseCallable | unknown;
};

type TGoogConstructor<TPrototype extends TGoogPrototype = TGoogPrototype> = {
    new (...args: unknown[]): unknown;
    prototype: TPrototype;
    superClass_?: TPrototype;
    base?: (me: object, methodName: string, ...args: unknown[]) => unknown;
};

type TGoogCoordinate = {
    x: number;
    y: number;
    scale: (x: number, y?: number) => TGoogCoordinate;
};

type TGoogCoordinateCtor = {
    new (x?: number, y?: number): TGoogCoordinate;
    prototype: TGoogCoordinate;
    difference?: (coord1: TGoogCoordinate, coord2: TGoogCoordinate) => TGoogCoordinate;
};

type TGoogSizeCtor = new (width: number, height: number) => { width: number; height: number };

type TGoog = {
    inherits: (childCtor: TGoogConstructor, parentCtor: TGoogConstructor) => void;
    math: {
        Size?: TGoogSizeCtor;
        Coordinate?: TGoogCoordinateCtor;
    };
    isDef: (value: unknown) => boolean;
    isNumber: (value: unknown) => boolean;
    dom: {
        removeNode?: (node: Node | null | undefined) => void;
    };
};

const goog = {} as TGoog;

goog.inherits = function (childCtor, parentCtor) {
    function tempCtor() {}

    tempCtor.prototype = parentCtor.prototype;
    childCtor.superClass_ = parentCtor.prototype;
    childCtor.prototype = new (tempCtor as unknown as new () => TGoogPrototype)() as typeof childCtor.prototype;
    childCtor.prototype.constructor = childCtor;

    childCtor.base = function (me, methodName, ...args) {
        const method = parentCtor.prototype[methodName];

        if (typeof method !== 'function') {
            return undefined;
        }

        return method.apply(me, args);
    };
};

goog.math = {};

goog.isDef = function (value) {
    return value !== undefined;
};

goog.math.Size = function (this: { width: number; height: number }, width: number, height: number) {
    this.width = width;
    this.height = height;
} as unknown as TGoogSizeCtor;

goog.isNumber = function (value) {
    return typeof value === 'number' || (typeof value === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(value));
};

goog.dom = {};

goog.dom.removeNode = function (node) {
    if (node?.parentNode) {
        node.parentNode.removeChild(node);
    }
};

goog.math.Coordinate = function (this: TGoogCoordinate, x?: number, y?: number) {
    this.x = goog.isDef(x) ? Number(x) : 0;
    this.y = goog.isDef(y) ? Number(y) : 0;
} as unknown as TGoogCoordinateCtor;

goog.math.Coordinate.prototype.scale = function (x: number, y?: number) {
    const vertical_scale = goog.isNumber(y) ? Number(y) : x;

    this.x *= x;
    this.y *= vertical_scale;

    return this;
};

goog.math.Coordinate.difference = function (coord1, coord2) {
    return new goog.math.Coordinate!(coord1.x - coord2.x, coord1.y - coord2.y);
};

export default goog;
