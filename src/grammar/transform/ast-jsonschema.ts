import { types } from '../../'
import { Node, Type } from '../interface'

export class Context {
    root = null
}

export interface Visitor {
    start: (node, context: Context) => any
    router: (node, context: Context) => any
    [x: number]: (node: any, context: Context) => any
}

export const getDecorateArgs = (decorate, index) => {
    if (!decorate[index]) {
        return null
    }
    if (decorate[index].type !== Type.type) {
        return null
    }
    return decorate[index].value.value
}

export const setDecorator = (decorators, target) => {
    for (const decorate of decorators) {
        if (!types[decorate.name]) {
            throw new Error('not implemented decorate:' + decorate.name)
        }
        if (decorate.name === '_' || decorate.name === 'description') {
            const description = getDecorateArgs(decorate.arguments, 0) || ''
            if (description) {
                if (!target.description) {
                    target.description = ''
                }
                target.description += description
            }
        } else if (decorate.name === 'range') {
            if (target.type === 'integer' || target.type === 'number' || target.type === 'string') {
                if (decorate.arguments.length === 1) {
                    target.maximum = getDecorateArgs(decorate.arguments, 0)
                } else if (decorate.arguments.length === 2) {
                    target.minimum = getDecorateArgs(decorate.arguments, 0)
                    target.maximum = getDecorateArgs(decorate.arguments, 1)
                }
            } else if (target.items) {
                if (decorate.arguments.length === 1) {
                    target.maxItems = getDecorateArgs(decorate.arguments, 0)
                } else if (decorate.arguments.length === 2) {
                    target.minItems = getDecorateArgs(decorate.arguments, 0)
                    target.maxItems = getDecorateArgs(decorate.arguments, 1)
                }
            }
        }
    }
}

const typeMapping = {
    str: 'string',
    int: 'integer',
    bool: 'boolean',
}

export const visitor: Visitor = {
    start: function (node, context) {
        context.root = node
        return this.router(node, context)
    },
    router: function (node, context) {
        if (!node) {
            return node
        }

        if (node instanceof Array) {
            if (!node.length) {
                return null
            }
            return this.router(node[node.length - 1], context)
        }

        const handler = this[node.type]

        if (!handler) {
            return node
        }

        return handler.call(this, node, context)
    },
    [Type.unary]: function (node, context) {
        const operator = node.operator
        const argument = this.router(node.argument, context)

        if (operator !== 'not') {
            return argument
        }

        return {
            not: argument
        }
    },
    [Type.member]: function (node, context) {
        const members = []
        let self = node
        while (self) {
            if (self.type === Type.member) {
                let property = self.property
                if (property instanceof Array) {
                    if (!property.length) {
                        members.unshift(null)
                        self = self.object
                        continue
                    }
                    property = property[property.length - 1]
                }
                if (property.type === Type.type && (
                    property.value.type === Type.number
                    || property.value.type === Type.string
                    || property.value.type === Type.regular
                    || property.value.type === Type.boolean
                    || property.value.type === Type.null)
                ) {
                    members.unshift(property.value.type === Type.null ? null : property.value.value)
                } else if (property.type === Type.identifier) {
                    members.unshift(property.value)
                } else {
                    members.unshift(this.router(property, context))
                }
            } else if (self.type === Type.type && self.value.type === Type.this) {
                members.unshift('#')
            } else {
                members.unshift(this.router(self, context))
            }
            self = self.object
        }
        let deep = 0
        while (members[members.length - 1] === null) {
            deep++
            members.pop()
        }
        let ret
        if (members[0] === '#') {
            ret = {
                $ref: members.join('/')
            }
        } else {
            ret = members[0]
        }
        while (deep--) {
            ret = {
                items: ret
            }
        }
        return ret
    },
    [Type.binary]: function (node, context) {
        const operator = node.operator
        const left = this.router(node.left, context)
        const right = this.router(node.right, context)

        if (operator !== '|' && operator !== '&') {
            return {}
        }

        if (left.anyOf && (left.anyOf instanceof Array) && operator === '|') {
            if (right.anyOf && (right.anyOf instanceof Array)) {
                left.anyOf = left.anyOf.concat(right.anyOf)
                return left
            } else {
                left.anyOf.push(right)
                return left
            }
        }

        if (left.allOf && (left.allOf instanceof Array) && operator === '&') {
            if (right.allOf && (right.allOf instanceof Array)) {
                left.allOf = left.allOf.concat(right.allOf)
                return left
            } else {
                left.allOf.push(right)
                return left
            }
        }

        if (right.anyOf && (right.anyOf instanceof Array) && operator === '|') {
            right.anyOf.push(left)
            return right
        }

        if (right.allOf && (right.allOf instanceof Array) && operator === '&') {
            right.allOf.push(left)
            return right
        }

        if (operator === '|') {
            return {
                anyOf: [
                    left,
                    right
                ]
            }
        }

        if (operator === '&') {
            return {
                allOf: [
                    left,
                    right
                ]
            }
        }
    },
    [Type.object]: function (node, context) {
        const object: any = {}
        for (const property of node.properties) {
            const key = property.key.value
            if (key === '$definitions') {
                object.definitions = {}
                if (property.value.type === Type.object) {
                    for (const prop of property.value.properties) {
                        object.definitions[prop.key.value] = this.router(prop.value, context)
                    }
                } else {
                    object.definitions = this.router(property.value, context)
                }
                continue
            }
            const value = this.router(property.value, context)
            if (value === null) {
                continue
            }
            if (key === '$export') {
                Object.assign(object, value)
                continue
            }
            if (property.key.type === Type.string || property.key.type === Type.number) {
                if (!object.properties) {
                    object.properties = {}
                }
                object.properties[key] = value
                setDecorator(property.decorators, object.properties[key])
            } else if (property.key.type === Type.identifier) {
                if (key === '$rest') {
                    object.additionalProperties = value
                    continue
                }
                if (!object.properties) {
                    object.properties = {}
                }
                object.properties[key] = value
                setDecorator(property.decorators, object.properties[key])
            } else if (property.key.type === Type.regular) {
                if (!object.patternProperties) {
                    object.patternProperties = {}
                }
                object.patternProperties[key.source] = value
                setDecorator(property.decorators, object.patternProperties[key.source])
            }
            if (!property.optional && property.key.type !== Type.regular) {
                if (!object.required) {
                    object.required = []
                }
                object.required.push(key)
            }
        }
        return object
    },
    [Type.match]: function (node, context) {
        return {}
    },
    [Type.enum]: function (node, context) {
        const compound = {
            enum: []
        }
        for (const arg of node.arguments) {
            const item = this.router(arg, context)
            compound.enum.push(item && item.hasOwnProperty('const') ? item.const : item)
        }
        return compound
    },
    [Type.call]: function (node, context) {
        const callee = this.router(node.callee, context)
        if (callee !== 'oneOf' && callee !== 'anyOf' && callee !== 'allOf' && callee !== 'not') {
            return {}
        }
        const compound = {
            [callee]: []
        }
        for (const arg of node.arguments) {
            compound[callee].push(this.router(arg, context))
        }
        return compound
    },
    [Type.array]: function (node, context) {
        const array = {
            items: []
        }
        for (const item of node.value) {
            array.items.push(this.router(item, context))
        }
        return array
    },
    [Type.identifier]: function (node, context) {
        if (node.value === 'never') {
            return false
        }
        if (node.value === 'any') {
            return null
        }
        return {
            type: typeMapping[node.value] || node.value
        }
    },
    [Type.null]: function (node, context) {
        return {
            const: null,
        }
    },
    [Type.self]: function (node, context) {
        return {}
    },
    [Type.this]: function (node, context) {
        return {}
    },
    [Type.boolean]: function (node, context) {
        return {
            const: node.value,
        }
    },
    [Type.number]: function (node, context) {
        return {
            const: node.value,
        }
    },
    [Type.string]: function (node, context) {
        return {
            const: node.value,
        }
    },
    [Type.regular]: function (node, context) {
        return {
            pattern: node.value.source
        }
    },
    [Type.type]: function (node, context) {
        if (node.value.type === Type.identifier && !types.hasOwnProperty(node.value.value)) {
            throw new Error('not implemented type:' + node.value.value)
        }
        const value = this.router(node.value, context)
        return value
    },
    [Type.spread]: function (node, context) {
        return {}
    },
    [Type.optional]: function (node, context) {
        return {}
    }
}

export default (ast: Node): any => {
    return visitor.start(ast, new Context())
}
