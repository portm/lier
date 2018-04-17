import { types } from '../../'
import { Node, Type } from '../interface'

class Context {
    root = null
}

interface Table {
    start: (any) => string
    router: (any, context: Context, indent: number) => any
    [x: number]: (node: any, context: Context, indent: number) => any
}

const fill = (input, length, space = 4) => {
    return new Array(length * space + 1).join(' ') + input
}

const binaryOperators = {
    '|': 7,
    '&': 9,
    '*': 14,
    '/': 14,
    '%': 14,
    '<<': 12,
    '>>': 12,
    '>>>': 12,
    '+': 13,
    '-': 13,
    '<=': 11,
    '>=': 11,
    '<': 11,
    '>': 11,
    '===': 10,
    '!==': 10,
    '==': 10,
    '!=': 10,
    '^': 8,
    '&&': 6,
    '||': 5,
}

const unaryOperators = {
    '+': true,
    '-': true,
    '!': true,
    '~': true,
}

const table: Table = {
    start: node => {
        const context = new Context()
        context.root = node
        return table.router(node, context, 0)
    },
    router: (node, context, indent) => {
        if (!node) {
            return node
        }

        if (node instanceof Array) {
            const ret = []
            for (const item of node) {
                ret.push(table.router(item, context, indent))
            }
            if (!ret.length) {
                return ''
            }
            return `(${ret.join(', ')})`
        }

        const handler = table[node.type]

        if (!handler) {
            return node
        }

        return handler(node, context, indent)
    },
    [Type.unary]: (node, context, indent) => {
        const operator = node.operator
        const argument = table.router(node.argument, context, indent)

        if (unaryOperators[operator]) {
            return `${operator} ${argument}`
        }

        throw new Error('not implemented unary operator:' + operator)
    },
    [Type.member]: (node, context, indent) => {
        const property = table.router(node.property, context, indent)
        let object = table.router(node.object, context, indent)
        if (node.object.type === Type.unary || node.object.type === Type.binary) {
            object = `(${object})`
        }
        if (node.property instanceof Array) {
            return `${object}[${property.slice(1, -1)}]`
        }
        return `${object}.${property}`
    },
    [Type.binary]: (node, context, indent) => {
        const operator = node.operator
        let left = table.router(node.left, context, indent)
        let right = table.router(node.right, context, indent)

        if (!binaryOperators[operator]) {
            throw new Error('not implemented binary operator:' + operator)
        }

        if (node.left.type === Type.binary && binaryOperators[node.left.operator] < binaryOperators[operator]) {
            left = `(${left})`
        }

        if (node.right.type === Type.binary && binaryOperators[node.right.operator] < binaryOperators[operator]) {
            right = `(${right})`
        }

        return `${left} ${operator} ${right}`
    },
    [Type.object]: (node, context, indent) => {
        const line = []
        for (const property of node.properties) {
            const key = table.router(property.key, context, indent + 1)
            const value = table.router(property.value, context, indent + 1)
            for (const decorate of property.decorators) {
                if (!types[decorate.name]) {
                    throw new Error('not implemented decorate:' + decorate.name)
                }

                const args = table.router(decorate.arguments, context, indent + 1)
                line.push(fill(`@${decorate.name}${args}`, indent + 1))
            }
            line.push(fill(`${key}${property.optional ? '?' : ''}: ${value}`, indent + 1))
        }
        if (!line.length) {
            return '{}'
        }
        return `{\n${line.join('\n')}\n${fill('}', indent)}`
    },
    [Type.enum]: (node, context, indent) => {
        const args = table.router(node.arguments, context, indent + 1)
        if (!args.length) {
            return 'enum {}'
        }
        const body = fill(args.slice(1, -1), indent + 1)
        return `enum {\n${body}\n${fill('}', indent)}`
    },
    [Type.match]: (node, context, indent) => {
        const test = table.router(node.test, context, indent)
        const cases = []
        for (let { test, value } of node.cases) {
            test = table.router(test, context, indent + 1)
            value = table.router(value, context, indent + 1)
            cases.push(fill(`case ${test} => ${value}`, indent + 1))
        }
        if (!cases.length) {
            return `match ${test} {}`
        }
        return `match ${test} {\n${cases.join('\n')}\n${fill('}', indent)}`
    },
    [Type.call]: (node, context, indent) => {
        const callee = table.router(node.callee, context, indent)
        const args = table.router(node.arguments, context, indent)
        return `${callee}${args}`
    },
    [Type.array]: (node, context, indent) => {
        const args = table.router(node.value, context, indent)
        return `[${args.slice(1, -1)}]`
    },
    [Type.identifier]: (node, context, indent) => {
        return node.value
    },
    [Type.null]: (node, context, indent) => {
        return null
    },
    [Type.self]: (node, context, indent) => {
        return 'self'
    },
    [Type.this]: (node, context, indent) => {
        return 'this'
    },
    [Type.boolean]: (node, context, indent) => {
        return node.value
    },
    [Type.number]: (node, context, indent) => {
        return node.value
    },
    [Type.string]: (node, context, indent) => {
        return `'${node.value.replace(/'/g, '\\\'')}'`
    },
    [Type.regular]: (node, context, indent) => {
        return node.value
    },
    [Type.type]: (node, context, indent) => {
        if (node.value.type === Type.identifier && !types.hasOwnProperty(node.value.value)) {
            throw new Error('not implemented type:' + node.value.value)
        }
        const value = table.router(node.value, context, indent)
        return value
    },
    [Type.rest]: (node, context, indent) => {
        return `...${table.router(node.value, context, indent)}`
    },
    [Type.optional]: (node, context, indent) => {
        return `${table.router(node.value, context, indent)}?`
    }
}

export default (ast: Node): string => {
    return String(table.start(ast))
}
