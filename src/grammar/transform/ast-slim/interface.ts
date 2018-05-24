export const SlimType: {
    unary: 'unary'
    definition: 'definition'
    oneOf: 'oneOf'
    anyOf: 'anyOf'
    allOf: 'allOf'
    binary: 'binary'
    object: 'object'
    enum: 'enum'
    any: 'any'
    tuple: 'tuple'
    array: 'array'
    self: 'self'
    regular: 'regular'
    const: 'const'
    property: 'property'
    item: 'item'
    element: 'element'
    declare: 'declare'
    decorate: 'decorate'
} = {
    unary: 'unary',
    definition: 'definition',
    oneOf: 'oneOf',
    anyOf: 'anyOf',
    allOf: 'allOf',
    binary: 'binary',
    object: 'object',
    enum: 'enum',
    any: 'any',
    tuple: 'tuple',
    array: 'array',
    self: 'self',
    regular: 'regular',
    const: 'const',
    property: 'property',
    item: 'item',
    element: 'element',
    declare: 'declare',
    decorate: 'decorate',
}

export interface Slim {
    type: string
    description?: string
}

export interface ElementSlim extends Slim {
    type: 'element'
    assign: Slim
    declares: Slim[]
}

export interface DeclareSlim extends Slim {
    type: 'declare'
    path: string[]
    value: Slim
}

export interface UnarySlim extends Slim {
    type: 'unary'
    operator: '!' | '~' | '+' | '-'
}

export interface DefinitionSlim extends Slim {
    type: 'definition'
    path: string[]
}

export interface OneOfSlim extends Slim {
    type: 'oneOf'
    arguments: Slim[]
}

export interface AnyOfSlim extends Slim {
    type: 'anyOf'
    arguments: Slim[]
}

export interface AllOfSlim extends Slim {
    type: 'allOf'
    arguments: Slim[]
}

export interface BinarySlim extends Slim {
    type: 'binary'
    operator: '||' | '*' |'/' | '%' |'<<' | '>>' | '>>>' | '+'
        | '-' | '<=' | '>=' | '<' | '>' | '===' | '!==' | '=='
        | '!=' | '^' | '&&' | '||'
    left: Slim
    right: Slim
}

export interface ObjectSlim extends Slim {
    type: 'object'
    properties: PropertySlim[]
    rest?: Slim
}

export interface PropertySlim extends Slim {
    type: 'property'
    name: string
    value: Slim
    optional: boolean
    decorators: DecorateSlim[]
}

export interface DecorateSlim extends Slim {
    type: 'decorate'
    name: string
    arguments: Slim[]
}

export interface EnumSlim extends Slim {
    type: 'enum'
    enums: ItemSlim[]
}

export interface ItemSlim extends Slim {
    type: 'item'
    name: string
    value?: number
}

export interface AnySlim extends Slim {
    type: 'any'
}

export interface TupleSlim extends Slim {
    type: 'tuple'
    items: Slim[]
}

export interface ArraySlim extends Slim {
    type: 'array'
    items: Slim
}

export interface SelfSlim extends Slim {
    type: 'self'
}

export interface RegularSlim extends Slim {
    type: 'regular'
    value: RegExp
}

export interface ConstSlim extends Slim {
    type: 'const'
    value: string | boolean | number | null
}
