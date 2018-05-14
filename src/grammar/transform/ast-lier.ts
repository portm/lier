import * as _ from 'lodash'
import { types } from '../../'
import { Node, Type } from '../interface'

class Context {
    declares: {
        [name: string]: any
    } = {}
}

const PACKING_KEY = '__packing__'
const packing = func => {
    func[PACKING_KEY] = true
    return func
}

const ispacking = func => {
    if (!func) {
        return func
    }
    return func.hasOwnProperty(PACKING_KEY)
}

const unpacking = func => {
    if (ispacking(func)) {
        return types.self(func)
    }
    return func
}

const isObject = value => {
    return value != null && typeof value === 'object'
}

interface Table {
    start: (any, context: Context) => Node
    router: (any, context: Context) => any
    [x: number]: (node: any, context: Context) => any
}

const table: Table = {
    start: (node, context) => {
        for (const element of node) {
            if (element.type !== Type.element) {
                continue
            }
            return table.router(element, context)
        }
        return null
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
            if (ispacking(argument)) {
                if (node.operator === '!') {
                    return types.not(unpacking(argument))
                }
                if (node.operator === '~') {
                    return packing(self => ~argument(self))
                }
                if (node.operator === '+') {
                    return packing(self => +argument(self))
                }
                if (node.operator === '-') {
                    return packing(self => -argument(self))
                }
            }
            if (node.operator === '!') {
                return types.not(argument)
            }
            throw new Error('not implemented unary:' + node.operator)
        }
        if (isObject(argument)) {
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
            return unpacking(table.router(property, context))
        })
        const object = node.object
        if (object.type === Type.self) {
            return packing(value => {
                let ret = value
                for (const item of properties) {
                    ret = ret[item]
                }
                return ret
            })
        }
        if (object.type !== Type.identifier || types.hasOwnProperty(object.value)) {
            let ret = table.router(object, context)
            for (const item of properties) {
                ret = ret[item]
            }
            return ret
        }
        
        return types.definition([object.value].concat(properties))
    },
    [Type.binary]: (node, context) => {
        const operator = node.operator
        const left = table.router(node.left, context)
        const right = table.router(node.right, context)
        const leftFunctioned = left instanceof Function
        const rightFunctioned = right instanceof Function

        if (operator === '|') {
            return types.anyOf(unpacking(left), unpacking(right))
        }

        if (operator === '&') {
            return types.allOf(unpacking(left), unpacking(right))
        }

        if (operator === '*') {
            if (leftFunctioned) {
                if (rightFunctioned) {
                    return packing(self => left(self) * right(self))
                }
                return packing(self => left(self) * right)
            }
            return left * right
        }

        if (operator === '/') {
            if (leftFunctioned) {
                if (rightFunctioned) {
                    return packing(self => left(self) / right(self))
                }
                return packing(self => left(self) / right)
            }
            return left / right
        }

        if (operator === '%') {
            if (leftFunctioned) {
                if (rightFunctioned) {
                    return packing(self => left(self) % right(self))
                }
                return packing(self => left(self) % right)
            }
            return left % right
        }

        if (operator === '<<') {
            if (leftFunctioned) {
                if (rightFunctioned) {
                    return packing(self => left(self) << right(self))
                }
                return packing(self => left(self) << right)
            }
            return left << right
        }

        if (operator === '>>') {
            if (leftFunctioned) {
                if (rightFunctioned) {
                    return packing(self => left(self) >> right(self))
                }
                return packing(self => left(self) >> right)
            }
            return left >> right
        }

        if (operator === '>>>') {
            if (leftFunctioned) {
                if (rightFunctioned) {
                    return packing(self => left(self) >>> right(self))
                }
                return packing(self => left(self) >>> right)
            }
            return left >>> right
        }

        if (operator === '+') {
            if (leftFunctioned) {
                if (rightFunctioned) {
                    return packing(self => left(self) + right(self))
                }
                return packing(self => left(self) + right)
            }
            return left + right
        }

        if (operator === '-') {
            if (leftFunctioned) {
                if (rightFunctioned) {
                    return packing(self => left(self) - right(self))
                }
                return packing(self => left(self) - right)
            }
            return left - right
        }

        if (operator === '<=') {
            if (leftFunctioned) {
                if (rightFunctioned) {
                    return packing(self => left(self) <= right(self))
                }
                return packing(self => left(self) <= right)
            }
            return left <= right
        }

        if (operator === '>=') {
            if (leftFunctioned) {
                if (rightFunctioned) {
                    return packing(self => left(self) >= right(self))
                }
                return packing(self => left(self) >= right)
            }
            return left >= right
        }

        if (operator === '<') {
            if (leftFunctioned) {
                if (rightFunctioned) {
                    return packing(self => left(self) < right(self))
                }
                return packing(self => left(self) < right)
            }
            return left < right
        }

        if (operator === '>') {
            if (leftFunctioned) {
                if (rightFunctioned) {
                    return packing(self => left(self) > right(self))
                }
                return packing(self => left(self) > right)
            }
            return left > right
        }

        if (operator === '===') {
            if (leftFunctioned) {
                if (rightFunctioned) {
                    return packing(self => left(self) === right(self))
                }
                return packing(self => left(self) === right)
            }
            return left === right
        }

        if (operator === '!==') {
            if (leftFunctioned) {
                if (rightFunctioned) {
                    return packing(self => left(self) !== right(self))
                }
                return packing(self => left(self) !== right)
            }
            return left !== right
        }

        if (operator === '==') {
            if (leftFunctioned) {
                if (rightFunctioned) {
                    return packing(self => left(self) == right(self))
                }
                return packing(self => left(self) == right)
            }
            return left == right
        }

        if (operator === '!=') {
            if (leftFunctioned) {
                if (rightFunctioned) {
                    return packing(self => left(self) != right(self))
                }
                return packing(self => left(self) != right)
            }
            return left != right
        }

        if (operator === '^') {
            if (leftFunctioned) {
                if (rightFunctioned) {
                    return packing(self => left(self) ^ right(self))
                }
                return packing(self => left(self) ^ right)
            }
            return left ^ right
        }

        if (operator === '&&') {
            if (leftFunctioned) {
                if (rightFunctioned) {
                    return packing(self => left(self) && right(self))
                }
                return packing(self => left(self) && right)
            }
            return left && right
        }

        if (operator === '||') {
            if (leftFunctioned) {
                if (rightFunctioned) {
                    return packing(self => left(self) || right(self))
                }
                return packing(self => left(self) || right)
            }
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
            let value = unpacking(table.router(property.value, context))
            for (const decorate of property.decorators) {
                if (decorate.type !== Type.decorator) {
                    continue
                }
                const decorateFun = types[decorate.name]
                if (!decorateFun) {
                    throw new Error('not implemented decorate:' + decorate.name)
                }
                const args = []
                for (const arg of decorate.arguments) {
                    args.push(table.router(arg, context))
                }
                args.push(value)
                value = decorateFun(...args)
            }
            if (property.optional) {
                value = types.optional(value)
            }
            ret[key] = value
        }
        return ret
    },
    [Type.enum]: (node, context) => {
        const args = []
        let index = 0
        for (const item of node.arguments) {
            if (item.type === Type.comment) {
                continue
            }
            if (item.value) {
                index = item.value
            }
            args.push(index ++)
        }
        return types.enum(...args)
    },
    [Type.match]: (node, context) => {
        const test = table.router(node.test, context)
        const cases = []
        for (const cs of node.cases) {
            if (cs.type !== Type.case) {
                continue
            }
            cases.push({
                cond: unpacking(table.router(cs.test, context)),
                type: unpacking(table.router(cs.value, context)),
            })
        }
        return types.match(test, cases)
    },
    [Type.call]: (node, context) => {
        const callee = table.router(node.callee, context)
        if (callee instanceof Function) {
            const args = []
            for (const arg of node.arguments) {
                args.push(table.router(arg, context))
            }
            if (ispacking(callee)) {
                return packing(self => {
                    if (node.callee.type === Type.member) {
                        const host = table.router(node.callee.object, context)
                        return callee(self).apply(host instanceof Function ? host(self) : self, args)
                    }
                    return callee(self)(...args)
                })
            }
            if (node.callee.type === Type.member) {
                const host = table.router(node.callee.object, context)
                return callee.apply(host, args)
            }
            return callee(...args)
        }
        throw new Error(callee + ' is not function')
    },
    [Type.tuple]: (node, context) => {
        const tuples = []
        for (const item of node.value) {
            if (item.type === Type.comment) {
                continue
            }
            tuples.push(unpacking(table.router(item, context)))
        }
        return types.tuple(tuples)
    },
    [Type.identifier]: (node, context) => {
        if (!types.hasOwnProperty(node.value)) {
            return types.definition([node.value])
        }
        return types[node.value]
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
        _.set(context.declares, node.path.map(path => path.value), unpacking(table.router(node.value, context)))
    },
    [Type.self]: (node, context) => {
        return types.self(self => self)
    },
    [Type.rest]: (node, context) => {
        return types.rest(table.router(node.value, context))
    },
    [Type.optional]: (node, context) => {
        return types.optional(table.router(node.value, context))
    },
    [Type.element]: (node, context) => {
        for (const type of node.declarations) {
            table.router(type, context)
        }
        return unpacking(table.router(node.assignment, context))
    },
    [Type.array]: (node, context) => {
        return [unpacking(table.router(node.value, context))]
    },
}

export interface Tree {
    declares: {
        [name: string]: any
    }
    assignment: any
}

export default (ast: Node[]): Tree => {
    const context = new Context()
    return {
        declares: context.declares,
        assignment: table.start(ast, context),
    }
}
