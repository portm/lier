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
        const ret = []
        for (const element of node) {
            ret.push(table.router(element, context, 0))
        }
        return ret.join('\n')
    },
    router: (node, context, indent) => {
        if (!node) {
            return node
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
        let object = table.router(node.object, context, indent)
        if (node.object.type === Type.unary || node.object.type === Type.binary) {
            object = `(${object})`
        }
        let ret = [object]
        for (const property of node.properties) {
            if (property.type === Type.identifier) {
                ret.push('.')
                ret.push(table.router(property, context, indent + 1))
            } else {
                ret.push('[')
                ret.push(table.router(property, context, indent + 1))
                ret.push(']')
            }
        }
        return ret.join('')
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
            if (property.type !== Type.property) {
                line.push(fill(table.router(property, context, indent + 1), indent + 1))
                continue
            }
            const key = table.router(property.key, context, indent + 1)
            const value = table.router(property.value, context, indent + 1)
            for (const decorate of property.decorators) {
                if (!types[decorate.name]) {
                    throw new Error('not implemented decorate:' + decorate.name)
                }
                const args = []
                for (const arg of decorate.arguments) {
                    args.push(table.router(arg, context, indent + 1))
                }
                line.push(fill(`@${decorate.name}(${args.join(', ')})`, indent + 1))
            }
            line.push(fill(`${key}${property.optional ? '?' : ''}: ${value}`, indent + 1))
        }
        if (!line.length) {
            return '{}'
        }
        return `{\n${line.join('\n')}\n${fill('}', indent)}`
    },
    [Type.enum]: (node, context, indent) => {
        if (!node.arguments.length) {
            return 'enum {}'
        }
        const args = []
        let first = true
        for (let i = node.arguments.length - 1; i >= 0; -- i) {
            const arg = node.arguments[i]
            let last = ''
            if (arg.type !== Type.comment) {
                if (!first) {
                    last = ','
                } else {
                    first = false
                }
            }
            args.unshift(fill(table.router(arg, context, indent + 1) + last, indent + 1))
        }
        return `enum {\n${args.join('\n')}\n${fill('}', indent)}`
    },
    [Type.match]: (node, context, indent) => {
        const test = table.router(node.test, context, indent)
        const cases = []
        for (const cs of node.cases) {
            if (cs.type !== Type.case) {
                cases.push(fill(table.router(cs, context, indent + 1), indent + 1))
            }
            const test = table.router(cs.test, context, indent + 1)
            const value = table.router(cs.value, context, indent + 1)
            cases.push(fill(`case ${test} => ${value}`, indent + 1))
        }
        if (!cases.length) {
            return `match ${test} {}`
        }
        return `match ${test} {\n${cases.join('\n')}\n${fill('}', indent)}`
    },
    [Type.call]: (node, context, indent) => {
        const callee = table.router(node.callee, context, indent)
        const args = []
        for (const arg of node.arguments) {
            args.push(table.router(arg, context, indent + 1))
        }
        return `${callee}(${args.join(', ')})`
    },
    [Type.tuple]: (node, context, indent) => {
        if (!node.value.length) {
            return '[]'
        }
        const args = []
        let first = true
        for (let i = node.value.length - 1; i >= 0; -- i) {
            const arg = node.value[i]
            let last = ''
            if (arg.type !== Type.comment) {
                if (!first) {
                    last = ','
                } else {
                    first = false
                }
            }
            args.unshift(fill(table.router(arg, context, indent + 1) + last, indent + 1))
        }
        return `[\n${args.join('\n')}\n${fill(']', indent)}`
    },
    [Type.array]: (node, context, indent) => {
        return `${table.router(node.value, context, indent)}[]`
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
        return node.value
    },
    [Type.rest]: (node, context, indent) => {
        return `...${table.router(node.value, context, indent)}`
    },
    [Type.optional]: (node, context, indent) => {
        return `${table.router(node.value, context, indent)}?`
    },
    [Type.comment]: (node, context, indent) => {
        return `# ${String(node.value).trim()}`
    },
    [Type.element]: (node, context, indent) => {
        const ret = []
        for (const declare of node.declarations) {
            ret.push(table.router(declare, context, indent))
        }
        ret.push(`${table.router(node.assignment, context, indent)}`)
        return ret.join('\n')
    },
    [Type.declare]: (node, context, indent) => {
        const path = node.path.slice()
        const ret = [`type ${table.router(path.shift(), context, indent)}`]
        for (const item of path) {
            if (item.type === Type.identifier) {
                ret.push(`.${item.value}`)
            } else {
                ret.push(`[${table.router(item, context, indent)}]`)
            }
        }
        ret.push(' ', table.router(node.value, context, indent))
        return ret.join('')
    },
}

export default (ast: Node[]): string => {
    return String(table.start(ast))
}
