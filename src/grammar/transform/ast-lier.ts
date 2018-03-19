import { types } from '../../'
import { Node, Type } from '../interface'

class Context {
    root = null
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
    start: (any) => Node
    router: (any, context: Context) => any
    [x: number]: (node: any, context: Context) => any
}

const table: Table = {
    start: node => {
        const context = new Context()
        context.root = node
        return unpacking(table.router(node, context))
    },
    router: (node, context) => {
        if (!node) {
            return node
        }

        if (node instanceof Array) {
            const ret = []
            for (const item of node) {
                ret.push(table.router(item, context))
            }
            return ret.length > 0 ? ret[ret.length - 1] : null
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
        let self = node
        const members = []
        while (self) {
            if (self.type === Type.member) {
                members.unshift(table.router(self.property, context))
            } else if (self.type === Type.type && (self.value.type === Type.this || self.value.type === Type.self)) {
                members.unshift(self.value)
            } else {
                members.unshift(table.router(self, context))
            }
            self = self.object
        }
        let deep = 0
        while (members[members.length - 1] === null) {
            deep++
            members.pop()
        }
        if (members[0].type === Type.this) {
            members.shift()
            let ret: any = types.ref(members)
            while (deep--) {
                ret = [ret]
            }
            return ret
        }
        if (members[0].type === Type.self) {
            members.shift()
            return packing(value => {
                let ret = value
                let innerDeep = deep
                for (const item of members) {
                    ret = ret[item]
                }
                while (innerDeep--) {
                    ret = [ret]
                }
                return ret
            })
        }
        let ret = members[0]
        members.shift()
        for (const item of members) {
            ret = ret[item]
        }
        while (deep--) {
            ret = [ret]
        }
        return ret
    },
    [Type.binary]: (node, context) => {
        const operator = node.operator
        const left = table.router(node.left, context)
        const right = table.router(node.right, context)
        const leftFunctioned = left instanceof Function
        const rightFunctioned = right instanceof Function

        if (operator === '|') {
            if (!leftFunctioned && !rightFunctioned && !isObject(left) && !isObject(right)) {
                return left | right
            }
            return types.anyOf(unpacking(left), unpacking(right))
        }

        if (operator === '&') {
            if (!leftFunctioned && !rightFunctioned && !isObject(left) && !isObject(right)) {
                return left & right
            }
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
            const key = table.router(property.key, context)
            let value = unpacking(table.router(property.value, context))
            for (const decorate of property.decorators) {
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
        for (const item of node.arguments) {
            args.push(table.router(item, context))
        }
        return types.enum(...args)
    },
    [Type.match]: (node, context) => {
        const test = table.router(node.test, context)
        const cases = []
        for (const { test, value } of node.cases) {
            cases.push({
                cond: unpacking(table.router(test, context)),
                type: unpacking(table.router(value, context)),
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
                        return callee(self).apply((host instanceof Function) ? host(self) : self, args)
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
    [Type.array]: (node, context) => {
        const ret = []
        for (const item of node.value) {
            ret.push(table.router(item, context))
        }
        return types.tuple(ret)
    },
    [Type.identifier]: (node, context) => {
        return node.value
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
    [Type.type]: (node, context) => {
        if (node.value.type === Type.identifier) {
            const value = node.value.value
            if (!types.hasOwnProperty(value)) {
                throw new Error('not implemented type:' + value)
            }
            return types[value]
        }
        const value = table.router(node.value, context)
        return value
    },
    [Type.this]: (node, context) => {
        return types.ref()
    },
    [Type.self]: (node, context) => {
        return types.self(self => self)
    },
    [Type.spread]: (node, context) => {
        return table.router(node.value, context)
    },
    [Type.optional]: (node, context) => {
        return table.router(node.value, context)
    },
}

export default (ast: Node): any => {
    return table.start(ast)
}
