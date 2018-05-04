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
    whitespace,
    call,
    array,
    identifier,
    null,
    boolean,
    number,
    string,
    regular,
    tuple,
    case,
    rest,
    optional,
    element,
    comment,
    declare,
    path,
}

export interface Node {
    type: Type
}

export interface StringNode extends Node {
    type: Type.string
    value: string
}

export interface BooleanNode extends Node {
    type: Type.boolean
    value: boolean
}

export interface RegularNode extends Node {
    type: Type.regular
    value: RegExp
}

export interface NumberNode extends Node {
    type: Type.number
    value: number
}

export interface SelfNode extends Node {
    type: Type.self
}

export interface NullNode extends Node {
    type: 14
}

export interface DeclareNode extends Node {
    type: Type.declare
    path: string[]
    value: Node
}

export interface IdentifierNode extends Node {
    type: Type.identifier
    value: string
}

export interface ArrayNode extends Node {
    type: Type.array
    value: Node
}

export interface CallNode extends Node {
    type: Type.call
    callee: Node
    arguments: Node[]
}

export interface MatchNode extends Node {
    type: Type.match
    test: Node
    cases: CaseNode[]
}

export interface CaseNode extends Node {
    type: 20
    test: Node
    value: Node
}

export interface EnumNode extends Node {
    type: 7
    arguments: Node[]
}

export interface ObjectNode extends Node {
    type: Type.object
    properties: PropertyNode[]
}

export interface PropertyNode extends Node {
    type: Type.property
    decorators: DecoratorNode[]
    key: Node
    optional: boolean
    value: Node
}

export interface DecoratorNode extends Node {
    type: Type.decorator
    name: string
    arguments: Node[]
}

export interface BinaryNode extends Node {
    type: Type.binary
    test: Node
    operator: string
    left: Node
    right: Node
}

export interface MemberNode extends Node {
    type: Type.member
    object: Node
    properties: Node[]
}

export interface UnaryNode extends Node {
    type: Type.unary
    operator: string
    argument: Node
}

export interface ElementNode extends Node {
    type: Type.element
    declarations: DeclareNode[]
    assignment: Node
}

export interface CommentNode extends Node {
    type: Type.comment
    value: string
}

export interface TupleNode extends Node {
    type: Type.tuple
    value: Node[]
}
