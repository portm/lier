import { types } from '../../'
import { Node, Type } from '../interface'
import utils from '../utils'

class Context {
}

interface Table {
    start: (any) => any
    router: (any, context: Context) => any
    [x: number]: (node: any, context: Context) => any
}

export const slimTypes = {
    unary: 'unary',
    identifier: 'identifier',
    oneOf: 'oneOf',
    anyOf: 'anyOf',
    allOf: 'allOf',
    binary: 'binary',
    object: 'object',
    enum: 'enum',
    any: 'any',
    tuple: 'tuple',
    array: 'array',
    self: 'self',
    regular: 'regular',
}

const table: Table = {
    start: node => {
        const context = new Context()
        for (const element of node) {
            if (element.type === Type.element) {
                return table.router(element, context)
            }
        }
        return null
    },
    router: (node, context) => {
        if (!node) {
            return node
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
        return {
            type: slimTypes.unary,
            operator,
            argument,
        }
    },
    [Type.member]: (node, context) => {
        return {
            type: slimTypes.identifier,
            path: [node.object].concat(node.properties).map(prop => {
                return table.router(prop, context)
            })
        }
    },
    [Type.path]: (node, context) => {
        const prop = node.value
        if (
            node.computed ||
            prop.type !== Type.null &&
            prop.type !== Type.boolean &&
            prop.type !== Type.number &&
            prop.type !== Type.string &&
            prop.type !== Type.identifier &&
            prop.type !== Type.regular
        ) {
            return table.router(prop, context)
        }
        return prop.value
    },
    [Type.binary]: (node, context) => {
        const operator = node.operator

        if (operator === '|') {
            return {
                type: slimTypes.anyOf,
                value: utils.spreadMember(node, operator).map(item => {
                    return table.router(item, context)
                })
            }
        }

        if (operator === '&') {
            return {
                type: slimTypes.allOf,
                value: utils.spreadMember(node, operator).map(item => {
                    return table.router(item, context)
                })
            }
        }

        return {
            type: slimTypes.binary,
            operator,
            left: table.router(node.left, context),
            right: table.router(node.right, context),
        }
    },
    [Type.object]: (node, context) => {
        const ret = {
            type: slimTypes.object,
            properties: [],
        }
        let desc = ''
        let value
        for (const property of node.properties) {
            if (property.type === Type.comment) {
                if (desc) {
                    desc += '\n'
                }
                desc += property.value
                continue
            }
            const key = property.key
            value = table.router(property.value, context)

            const item = {
                value,
                optional: property.optional,
            }

            ret.properties.push(item)

            const decorators = []
            for (const decorate of property.decorators) {
                if (decorate.type === Type.decorator) {
                    decorators.push(decorate)
                    continue
                }
                if (desc) {
                    desc += '\n'
                }
                desc += property.value
            }

            if (desc) {
                item['description'] = desc
            }
            desc = ''

            if (key.type === Type.identifier && key.value === '$rest') {
                ret['rest'] = item
                continue
            }

            if (decorators.length) {
                item['decorators'] = []
                for (const decorate of decorators) {
                    item['decorators'].push({
                        name: decorate.name,
                        arguments: decorate.arguments.map(arg => {
                            if (
                                arg.type !== Type.null &&
                                arg.type !== Type.boolean &&
                                arg.type !== Type.number &&
                                arg.type !== Type.string &&
                                arg.type !== Type.identifier &&
                                arg.type !== Type.regular
                            ) {
                                return table.router(arg, context)
                            }
                            return arg.value
                        })
                    })
                }
            }
        }
        if (desc && value) {
            if (value.description) {
                value.description += '\n' + desc
            } else {
                value.description = desc
            }
        }
        return ret
    },
    [Type.enum]: (node, context) => {
        let desc = ''
        const args = []
        let index = 0
        for (const arg of node.arguments) {
            if (arg.type === Type.comment) {
                if (desc) {
                    desc += '\n'
                }
                desc += arg.value
                continue
            }
            if (arg.value) {
                index = arg.value
            } else {
                arg.value = index ++
            }
            args.push(arg)
        }
        const ret = {
            type: slimTypes.enum,
            arguments: args,
        }
        if (desc) {
            ret['description'] = desc
        }
        desc = ''
        return ret
    },
    [Type.match]: (node, context) => {
        return {
            type: slimTypes.any,
        }
    },
    [Type.call]: (node, context) => {
        if (node.callee.value === 'oneOf') {
            return {
                type: slimTypes.oneOf,
                arguments: node.arguments.map(arg => {
                    return table.router(arg, context)
                })
            }
        }
        return {
            type: slimTypes.any,
        }
    },
    [Type.tuple]: (node, context) => {
        const args = []
        let desc = ''
        let value
        for (const arg of node.value) {
            if (arg.type === Type.comment) {
                if (desc) {
                    desc += '\n'
                }
                desc += arg.value
                continue
            }
            value = table.router(arg, context)
            if (desc) {
                value.description = desc
            }
            desc = ''
            args.push(value)
        }
        if (desc && value) {
            if (value.description) {
                value.description += '\n' + desc
            } else {
                value.description = desc
            }
        }
        return {
            type: slimTypes.tuple,
            value: args,
        }
    },
    [Type.array]: (node, context) => {
        return {
            type: slimTypes.array,
            value: table.router(node.value, context),
        }
    },
    [Type.self]: (node, context) => {
        return {
            type: slimTypes.self,
        }
    },
    [Type.regular]: (node, context) => {
        return {
            type: slimTypes.regular,
            value: node.value,
        }
    },
    [Type.identifier]: (node, context) => {
        if (types[node.value]) {
            return {
                type: node.value,
            }
        }
        return {
            type: slimTypes.identifier,
            path: [node.value],
        }
    },
    [Type.rest]: (node, context) => {
        return {
            type: slimTypes.any,
        }
    },
    [Type.optional]: (node, context) => {
        return {
            type: slimTypes.any,
        }
    },
    [Type.element]: (node, context) => {
        let desc = ''
        let value
        const ret = {
            declares: [],
            assign: null,
        }
        for (const declare of node.declarations) {
            if (declare.type === Type.comment) {
                if (desc) {
                    desc += '\n'
                }
                desc += declare.value
                continue
            }
            value = table.router(declare, context)
            if (desc) {
                value.description = desc
            }
            desc = ''
            ret.declares.push(value)
        }
        if (desc && value) {
            if (value.description) {
                value.description += '\n' + desc
            } else {
                value.description = desc
            }
        }
        ret.assign = table.router(node.assignment, context)
        return ret
    },
    [Type.declare]: (node, context) => {
        return {
            path: node.path.map(path => {
                if (
                    path.type !== Type.null &&
                    path.type !== Type.boolean &&
                    path.type !== Type.number &&
                    path.type !== Type.string &&
                    path.type !== Type.identifier &&
                    path.type !== Type.regular
                ) {
                    return table.router(path, context)
                }
                return path.value
            }),
            value: table.router(node.value, context)
        }
    },
}

export default (ast: Node[]) => {
    return table.start(ast)
}
