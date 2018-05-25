import * as _ from 'lodash'
import { types } from '../'
import { Node, Type } from './interface'
import utils from './utils'

class Context {
    declares: {
        path: string
        value: Node
    }[] = []
    using: {
        [name: string]: string[]
    } = {}
}

interface Table {
    start: (any, context: Context) => void
    router: (any, context: Context) => any
    [x: number]: (node: any, context: Context) => any
}

const table: Table = {
    start: (node, context) => {
        for (const element of node) {
            if (element.type !== Type.element) {
                continue
            }
            table.router(element, context)
        }
    },
    router: (node, context) => {
        if (!node) {
            return node
        }

        const handler = table[node.type]

        if (handler) {
            return handler(node, context)
        }

        return node
    },
    [Type.unary]: (node, context) => {
        const argument = table.router(node.argument, context)
        if (argument instanceof Function) {
            return null
        }
        if (utils.isObject(argument)) {
            if (node.operator === '!') {
                return types.not(argument)
            }
            throw new Error('not implemented unary:' + node.operator)
        }
        if (node.operator === '!') {
            return !argument
        }
        if (node.operator === '~') {
            return ~argument
        }
        if (node.operator === '+') {
            return +argument
        }
        if (node.operator === '-') {
            return -argument
        }
    },
    [Type.member]: (node, context) => {
        const properties = node.properties.map(property => {
            return table.router(property, context)
        })
        const object = node.object
        if (object.type === Type.self) {
            return null
        }
        if (object.type !== Type.identifier || types.hasOwnProperty(object.value)) {
            let ret = table.router(object, context)
            for (const item of properties) {
                ret = ret[item]
            }
            return ret
        }
        const path = [object.value].concat(properties)
        context.using[path.join('[]')] = path
        return null
    },
    [Type.binary]: (node, context) => {
        const operator = node.operator
        const left = table.router(node.left, context)
        const right = table.router(node.right, context)
        
        if (operator === '|') {
            return left | right
        }

        if (operator === '&') {
            return left & right
        }

        if (operator === '*') {
            return left * right
        }

        if (operator === '/') {
            return left / right
        }

        if (operator === '%') {
            return left % right
        }

        if (operator === '<<') {
            return left << right
        }

        if (operator === '>>') {
            return left >> right
        }

        if (operator === '>>>') {
            return left >>> right
        }

        if (operator === '+') {
            return left + right
        }

        if (operator === '-') {
            return left - right
        }

        if (operator === '<=') {
            return left <= right
        }

        if (operator === '>=') {
            return left >= right
        }

        if (operator === '<') {
            return left < right
        }

        if (operator === '>') {
            return left > right
        }

        if (operator === '===') {
            return left === right
        }

        if (operator === '!==') {
            return left !== right
        }

        if (operator === '==') {
            return left == right
        }

        if (operator === '!=') {
            return left != right
        }

        if (operator === '^') {
            return left ^ right
        }

        if (operator === '&&') {
            return left && right
        }

        if (operator === '||') {
            return left || right
        }

        throw new Error('not implemented binary operator:' + operator)
    },
    [Type.object]: (node, context) => {
        const ret = {}
        for (const property of node.properties) {
            if (property.type !== Type.property) {
                continue
            }
            const key = property.key.type === Type.identifier ? property.key.value : table.router(property.key, context)
            const value = table.router(property.value, context)
            for (const decorate of property.decorators) {
                if (decorate.type !== Type.decorator) {
                    continue
                }
                const decorateFun = types[decorate.name]
                if (!decorateFun) {
                    throw new Error('not implemented decorate:' + decorate.name)
                }
                for (const arg of decorate.arguments) {
                    table.router(arg, context)
                }
            }
            ret[key] = value
        }
        return ret
    },
    [Type.enum]: (node, context) => {
        return null
    },
    [Type.match]: (node, context) => {
        table.router(node.test, context)
        for (const cs of node.cases) {
            if (cs.type !== Type.case) {
                continue
            }
            table.router(cs.test, context)
            table.router(cs.value, context)
        }
        return null
    },
    [Type.call]: (node, context) => {
        const callee = table.router(node.callee, context)
        if (callee instanceof Function) {
            for (const arg of node.arguments) {
                table.router(arg, context)
            }
            return null
        }
        throw new Error(callee + ' is not function')
    },
    [Type.tuple]: (node, context) => {
        for (const item of node.value) {
            if (item.type === Type.comment) {
                continue
            }
            table.router(item, context)
        }
        return null
    },
    [Type.identifier]: (node, context) => {
        if (!types.hasOwnProperty(node.value)) {
            context.using[node.value] = node.value
        }
        return null
    },
    [Type.path]: (node, context) => {
        if (!node.computed && node.value.type === Type.identifier) {
            return node.value.value
        }
        return table.router(node.value, context)
    },
    [Type.null]: (node, context) => {
        return null
    },
    [Type.boolean]: (node, context) => {
        return node.value
    },
    [Type.number]: (node, context) => {
        return node.value
    },
    [Type.string]: (node, context) => {
        return node.value
    },
    [Type.regular]: (node, context) => {
        return node.value
    },
    [Type.declare]: (node, context) => {
        const path = node.path.map(path => path.value)
        const value = table.router(node.value, context)
        context.declares.push({
            path,
            value,
        })
    },
    [Type.self]: (node, context) => {
        return null
    },
    [Type.rest]: (node, context) => {
        return table.router(node.value, context)
    },
    [Type.optional]: (node, context) => {
        return table.router(node.value, context)
    },
    [Type.element]: (node, context) => {
        for (const type of node.declarations) {
            table.router(type, context)
        }
        table.router(node.assignment, context)
    },
    [Type.array]: (node, context) => {
        return [table.router(node.value, context)]
    },
}

export default (ast: Node[], declares = {}): void => {
    const context = new Context()
    table.start(ast, context)
    for (const item of context.declares) {
        _.set(declares, item.path, item.value)
    }
    for (const path of _.values(context.using)) {
        if (!_.has(declares, path)) {
            throw new Error('not implemented type: ' + path)
        }
    }
}
