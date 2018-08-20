import { types } from '../../'
import { Node, Type } from '../interface'
import * as _ from 'lodash'

class Context {
    definitions: {
        [key: string]: any
    }
}

interface Visitor {
    start: (node, context: Context) => any
    router: (node, context: Context) => any
    [x: number]: (node: any, context: Context) => any
}

const getDecorateArgs = (decorate, index) => {
    if (!decorate[index] || isNaN(+decorate[index].value) || decorate[index].value === 'Infinity') {
        return null
    }
    return decorate[index].value
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
                    const temp = getDecorateArgs(decorate.arguments, 0)
                    if (temp) {
                        target.maximum = temp
                    }
                } else if (decorate.arguments.length === 2) {
                    target.minimum = getDecorateArgs(decorate.arguments, 0)
                    const temp = getDecorateArgs(decorate.arguments, 1)
                    if (temp) {
                        target.maximum = temp
                    }
                }
            } else if (target.items) {
                if (decorate.arguments.length === 1) {
                    const temp = getDecorateArgs(decorate.arguments, 0)
                    if (temp) {
                        target.maxItems = temp
                    }
                } else if (decorate.arguments.length === 2) {
                    target.minItems = getDecorateArgs(decorate.arguments, 0)
                    const temp = getDecorateArgs(decorate.arguments, 1)
                    if (temp) {
                        target.minItems = temp
                    }
                }
            }
        }
    }
}

const mappings = {
    str: 'string',
    int: 'integer',
    uint: 'integer',
    number: 'number',
    double: 'number',
    int8: 'integer',
    int16: 'integer',
    int32: 'integer',
    int64: 'number',
    int128: 'number',
    uint8: 'integer',
    uint32: 'integer',
    uint64: 'number',
    uint128: 'number',
    bool: 'boolean',
    float: 'number',
    long: 'number',
    short: 'integer',
    byte: 'integer',
    oneOf: 'oneOf',
    anyOf: 'anyOf',
    allOf: 'allOf',
}

const visitor: Visitor = {
    start: function (node, context) {
        let desc = ''
        let ret = null
        for (const element of node) {
            if (element.type !== Type.element) {
                if (desc) {
                    desc += '\n' + element.value
                } else {
                    desc = element.value
                }
                continue
            }
            ret = this.router(element, context)
        }
        if (desc && ret) {
            ret.description = desc
            desc = ''
        }
        return ret
    },
    router: function (node, context) {
        if (!node) {
            return node
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
        if (node.object.type !== Type.identifier) {
            return {}
        }
        const path = []
        for (const item of node.properties) {
            const value = item.value
            if (
                value.type !== Type.null &&
                value.type !== Type.boolean &&
                value.type !== Type.number &&
                value.type !== Type.string &&
                value.type !== Type.identifier &&
                value.type !== Type.regular
            ) {
                return {}
            }
            path.push(item.value.value)
        }
        return {
            $ref: `#/definitions/${node.object.value}/${path.join('/')}`
        }
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

        if (left.enum && (left.enum instanceof Array) && operator === '|') {
            if (right.enum && (right.enum instanceof Array)) {
                left.enum = left.enum.concat(right.enum)
                return left
            } else if (right.hasOwnProperty('const')) {
                left.enum.push(right.const)
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

        if (right.enum && (right.enum instanceof Array) && operator === '|' && left.hasOwnProperty('const')) {
            right.enum.push(left.const)
            return right
        }

        if (right.allOf && (right.allOf instanceof Array) && operator === '&') {
            right.allOf.push(left)
            return right
        }

        if (operator === '|') {
            if (left.hasOwnProperty('const') && right.hasOwnProperty('const')) {
                return {
                    enum: [
                        left.const,
                        right.const
                    ]
                }
            }
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
        const object: any = {
            type: 'object',
        }
        if (node.properties.length) {
            let desc
            let value
            for (const property of node.properties) {
                if (property.type !== Type.property) {
                    if (desc) {
                        desc += '\n' + property.value
                    } else {
                        desc = property.value
                    }
                    continue
                }
                const key = property.key
                value = this.router(property.value, context)
                if (value === null) {
                    continue
                }
                if (key.type === Type.string || key.type === Type.number) {
                    if (!object.properties) {
                        object.properties = {}
                    }
                    object.properties[key.value] = value
                    const decorators = []
                    for (const decorate of property.decorators) {
                        if (decorate.type === Type.decorator) {
                            decorators.push(decorate)
                            continue
                        }
                        if (desc) {
                            desc += '\n' + decorate.value
                        } else {
                            desc = decorate.value
                        }
                    }
                    setDecorator(decorators, object.properties[key.value])
                    if (desc) {
                        if (value) {
                            value.description = desc
                        }
                        desc = ''
                    }
                } else if (key.type === Type.identifier) {
                    if (key.value === '$rest') {
                        object.additionalProperties = value
                        continue
                    }
                    if (!object.properties) {
                        object.properties = {}
                    }
                    object.properties[key.value] = value
                    setDecorator(property.decorators, object.properties[key.value])
                    if (desc) {
                        if (value) {
                            value.description = desc
                        }
                        desc = ''
                    }
                } else if (key.type === Type.regular) {
                    if (!object.patternProperties) {
                        object.patternProperties = {}
                    }
                    object.patternProperties[key.value.source] = value
                    setDecorator(property.decorators, object.patternProperties[key.value.source])
                    if (desc) {
                        if (value) {
                            value.description = desc
                        }
                        desc = ''
                    }
                }
                if (!property.optional && key.type !== Type.regular) {
                    if (!object.required) {
                        object.required = []
                    }
                    object.required.push(key.value)
                }
                if (desc && value) {
                    if (value.description) {
                        value.description += '\n' + desc
                    } else {
                        value.description = desc
                    }
                }
            }
        } else {
            object.properties = {}
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
        let index = 0
        for (const arg of node.arguments) {
            if (arg.value) {
                index = arg.value
            }
            compound.enum.push({
                description: arg.name,
                const: index ++
            })
        }
        return compound
    },
    [Type.call]: function (node, context) {
        const callee = this.router(node.callee, context)
        if (!callee) {
            return {}
        }
        if (callee.type === 'oneOf' || callee.type === 'anyOf' || callee.type === 'allOf' || callee.type === 'not') {
            const compound = {
                [callee.type]: []
            }
            for (const arg of node.arguments) {
                compound[callee.type].push(this.router(arg, context))
            }
            return compound
        }
        if (node.callee.type === Type.identifier && node.callee.value === 'definition') {
            if (!node.arguments.length || node.arguments[0].type !== Type.string) {
                return {}
            }
            const compound = {
                $ref: `#/definitions/${node.arguments[0].value.split('.').join('/')}`
            }
            return compound
        }
    },
    [Type.array]: function (node, context) {
        const array = {
            items: this.router(node.value, context)
        }
        return array
    },
    [Type.tuple]: function (node, context) {
        const tuples = []
        let desc = ''
        for (const item of node.value) {
            if (item.type === Type.comment) {
                if (desc) {
                    desc += '\n' + item.value
                } else {
                    desc = item.value
                }
                continue
            }
            const value = this.router(item, context)
            tuples.push(value)
            if (desc) {
                value.description = desc
                desc = ''
            }
        }
        if (desc && tuples.length) {
            const last = tuples[tuples.length - 1]
            if (last.description) {
                last.description += '\n' + desc
            } else {
                last.description = desc
            }
        }
        return {
            type: 'array',
            items: tuples,
            minItems: tuples.length,
            maxItems: tuples.length,
        }
    },
    [Type.identifier]: function (node, context) {
        if (node.value === 'never') {
            return false
        }
        if (node.value === 'any') {
            return {}
        }
        const mapping = mappings[node.value]
        if (mapping) {
            const ret = {
                type: mapping,
            }
            if (mapping !== node.value && node.value !== 'int') {
                ret['format'] = node.value
            }
            return ret
        }
        return {
            $ref: `#/definitions/${node.value}`,
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
    [Type.rest]: function (node, context) {
        return {}
    },
    [Type.optional]: function (node, context) {
        return {}
    },
    [Type.declare]: function (node, context) {
        if (!context.definitions) {
            context.definitions = {}
        }
        _.set(context.definitions, node.path.map(path => path.value), this.router(node.value, context))
    },
    [Type.element]: function (node, context) {
        for (const declare of node.declarations) {
            this.router(declare, context)
        }
        return this.router(node.assignment, context)
    }
}

export {
    mappings,
}

export default (ast: Node[]): any => {
    const context = new Context()
    const ret = visitor.start(ast, context)
    if (ret) {
        if (context.definitions) {
            ret.definitions = context.definitions
        }
    }
    return ret
}
