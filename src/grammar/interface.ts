export enum Type {
    unary = 1,
    member,
    binary,
    decorator,
    property,
    object,
    enum,
    match,
    self,
    this,
    call,
    array,
    identifier,
    null,
    boolean,
    number,
    string,
    regular,
    type,
    case,
    spread,
    optional,
}

export interface Node {
    type: Type
}

export interface StringNode extends Node {
    value: string
}

export interface BooleanNode extends Node {
    value: boolean
}

export interface RegularNode extends Node {
    value: RegExp
}

export interface NumberNode extends Node {
    value: number
}

export interface ThisNode extends Node {
}

export interface SelfNode extends Node {
}

export interface NullNode extends Node {
}

export interface TypeNode extends Node {
    value: Node
}

export interface IdentifierNode extends Node {
    value: string
}

export interface ArrayNode extends Node {
    value: Node[]
}

export interface CallNode extends Node {
    callee: Node
    arguments: Node[]
}

export interface MatchNode extends Node {
    test: Node
    cases: CaseNode[]
}

export interface CaseNode extends Node {
    test: Node
    value: Node
}

export interface EnumNode extends Node {
    arguments: Node[]
}

export interface ObjectNode extends Node {
    properties: PropertyNode[]
}

export interface PropertyNode extends Node {
    decorators: DecoratorNode[]
    key: Node
    optional: boolean
    value: Node
}

export interface DecoratorNode extends Node {
    name: string
    arguments: Node[]
}

export interface ConditionalNode extends Node {
    test: Node
    consequent: Node
    alternate: Node
}

export interface BinaryNode extends Node {
    test: Node
    operator: string
    left: Node
    right: Node
}

export interface MemberNode extends Node {
    object: Node
    property: Node | Node[]
}

export interface UnaryNode extends Node {
    operator: string
    argument: Node
}
