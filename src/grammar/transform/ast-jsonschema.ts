import { types } from '../../'
import { Node, Type } from '../interface'

class Context {
    root = null
}

interface Table {
    start: (any) => string
    router: (any, context: Context) => any
    [x: number]: (node: any, context: Context) => any
}

const getDecorateArgs = (decorate, index) => {
    if (!decorate[index]) {
        return null
    }
    if (decorate[index].type !== Type.type) {
        return null
    }
    return decorate[index].value.value
}

const setDecorator = (decorators, target) => {
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

const table: Table = {
    start: node => {
        const context = new Context()
        context.root = node
        return table.router(node, context)
    },
    router: (node, context) => {
        if (!node) {
            return node
        }

        if (node instanceof Array) {
            if (!node.length) {
                return null
            }
            return table.router(node[node.length - 1], context)
        }

        const handler = table[node.type]

        if (!handler) {
            return node
        }

        return handler(node, context)
    },
    [Type.unary]: (node, context) => {
        const operator = node.operator
        const argument = table.router(node.argument, context)

        if (operator !== 'not') {
            return argument
        }

        return {
            not: argument
        }
    },
    [Type.member]: (node, context) => {
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
                    members.unshift(table.router(property, context))
                }
            } else if (self.type === Type.type && self.value.type === Type.this) {
                members.unshift('#')
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
    [Type.binary]: (node, context) => {
        const operator = node.operator
        const left = table.router(node.left, context)
        const right = table.router(node.right, context)

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
    [Type.object]: (node, context) => {
        const object: any = {}
        for (const property of node.properties) {
            const key = property.key.value
            const value = table.router(property.value, context)
            if (value === null) {
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
    [Type.match]: (node, context) => {
        return {}
    },
    [Type.enum]: (node, context) => {
        const compound = {
            enum: []
        }
        for (const arg of node.arguments) {
            const item = table.router(arg, context)
            compound.enum.push(item && item.hasOwnProperty('const') ? item.const : item)
        }
        return compound
    },
    [Type.call]: (node, context) => {
        const callee = table.router(node.callee, context)
        if (callee !== 'oneOf' && callee !== 'anyOf' && callee !== 'allOf' && callee !== 'not') {
            return {}
        }
        const compound = {
            [callee]: []
        }
        for (const arg of node.arguments) {
            compound[callee].push(table.router(arg, context))
        }
        return compound
    },
    [Type.array]: (node, context) => {
        const array = {
            items: []
        }
        for (const item of node.value) {
            array.items.push(table.router(item, context))
        }
        return array
    },
    [Type.identifier]: (node, context) => {
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
    [Type.null]: (node, context) => {
        return {
            const: null,
        }
    },
    [Type.self]: (node, context) => {
        return {}
    },
    [Type.this]: (node, context) => {
        return {}
    },
    [Type.boolean]: (node, context) => {
        return {
            const: node.value,
        }
    },
    [Type.number]: (node, context) => {
        return {
            const: node.value,
        }
    },
    [Type.string]: (node, context) => {
        return {
            const: node.value,
        }
    },
    [Type.regular]: (node, context) => {
        return {
            pattern: node.value.source
        }
    },
    [Type.type]: (node, context) => {
        if (node.value.type === Type.identifier && !types.hasOwnProperty(node.value.value)) {
            throw new Error('not implemented type:' + node.value.value)
        }
        const value = table.router(node.value, context)
        return value
    },
    [Type.spread]: (node, context) => {
        return {}
    },
    [Type.optional]: (node, context) => {
        return {}
    }
}

export default (ast: Node): string => {
    return table.start(ast)
}
