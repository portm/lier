import * as _ from 'lodash'
import { types } from '../'
import { Node, Type } from './interface'
import utils from './utils'

export class Context {
    declares: {
        path: string
        value: Node
    }[] = []
    using: {
        [name: string]: string[]
    } = {}
}

export interface Checker {
    start: (any, context: Context) => void
    router: (any, context: Context) => any
    [x: number]: (node: any, context: Context) => any
}

export const checker: Checker = {
    start: (node, context) => {
        for (const element of node) {
            if (element.type !== Type.element) {
                continue
            }
            checker.router(element, context)
        }
    },
    router: (node, context) => {
        if (!node) {
            return node
        }

        const handler = checker[node.type]

        if (handler) {
            return handler(node, context)
        }

        return node
    },
    [Type.unary]: (node, context) => {
        const argument = checker.router(node.argument, context)
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
            return checker.router(property, context)
        })
        const object = node.object
        if (object.type === Type.self) {
            return null
        }
        if (object.type !== Type.identifier || types.hasOwnProperty(object.value)) {
            let ret = checker.router(object, context)
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
        const left = checker.router(node.left, context)
        const right = checker.router(node.right, context)
        
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
            const key = property.key.type === Type.identifier ? property.key.value : checker.router(property.key, context)
            const value = checker.router(property.value, context)
            for (const decorate of property.decorators) {
                if (decorate.type !== Type.decorator) {
                    continue
                }
                const decorateFun = types[decorate.name]
                if (!decorateFun) {
                    throw new Error('not implemented decorate:' + decorate.name)
                }
                for (const arg of decorate.arguments) {
                    checker.router(arg, context)
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
        checker.router(node.test, context)
        for (const cs of node.cases) {
            if (cs.type !== Type.case) {
                continue
            }
            checker.router(cs.test, context)
            checker.router(cs.value, context)
        }
        return null
    },
    [Type.call]: (node, context) => {
        if (
            node.callee.type === Type.identifier
            && node.callee.value === 'definition'
            && node.arguments.length
        ) {
            const value = checker.router(node.arguments[0], context)
            if (value) {
                const path = value.split('.')
                context.using[path.join('[]')] = path
            }
            return null
        }
        const callee = checker.router(node.callee, context)
        if (callee instanceof Function) {
            for (const arg of node.arguments) {
                checker.router(arg, context)
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
            checker.router(item, context)
        }
        return null
    },
    [Type.identifier]: (node, context) => {
        if (!types.hasOwnProperty(node.value)) {
            context.using[node.value] = node.value
        }
        return types[node.value]
    },
    [Type.path]: (node, context) => {
        if (!node.computed && node.value.type === Type.identifier) {
            return node.value.value
        }
        return checker.router(node.value, context)
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
        const value = checker.router(node.value, context)
        context.declares.push({
            path,
            value,
        })
    },
    [Type.self]: (node, context) => {
        return null
    },
    [Type.rest]: (node, context) => {
        return checker.router(node.value, context)
    },
    [Type.optional]: (node, context) => {
        return checker.router(node.value, context)
    },
    [Type.element]: (node, context) => {
        for (const type of node.declarations) {
            checker.router(type, context)
        }
        checker.router(node.assignment, context)
    },
    [Type.array]: (node, context) => {
        return [checker.router(node.value, context)]
    },
}

export default (ast: Node[], declares = {}): void => {
    const context = new Context()
    checker.start(ast, context)
    for (const item of context.declares) {
        _.set(declares, item.path, item.value)
    }
    for (const path of _.values(context.using)) {
        if (!_.has(declares, path)) {
            throw new Error('not implemented type: ' + path)
        }
    }
}
