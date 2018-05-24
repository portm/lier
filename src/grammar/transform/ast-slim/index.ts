import { types } from '../../../'
import { Node, Type, DeclareNode } from '../../interface'
import utils from '../../utils'
import {
    SlimType,
    ItemSlim,
    Slim,
    ConstSlim,
    DeclareSlim,
    ElementSlim,
    AnySlim,
    DefinitionSlim,
    RegularSlim,
    SelfSlim,
    ArraySlim,
    TupleSlim,
    OneOfSlim,
    AnyOfSlim,
    AllOfSlim,
    EnumSlim,
    ObjectSlim,
    PropertySlim,
    BinarySlim,
    UnarySlim
}  from './interface'

class Context {
}

interface Table {
    start: (any) => Slim
    router: (any, context: Context) => Slim
    [x: number]: (node: any, context: Context) => Slim
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
            type: SlimType.unary,
            operator,
            argument,
        } as UnarySlim
    },
    [Type.member]: (node, context) => {
        const ret = {
            type: SlimType.definition,
            path: []
        } as DefinitionSlim
        const list = [node.object].concat(node.properties)
        for (let prop of list) {
            if (prop.type === Type.path) {
                prop = prop.value
            }
            if (prop.type === Type.null ||
                prop.type === Type.boolean ||
                prop.type === Type.number ||
                prop.type === Type.string ||
                prop.type === Type.identifier ||
                prop.type === Type.regular
            ) {
                ret.path.push(prop.value)
                continue
            }
            return {
                type: SlimType.any,
            } as AnySlim
        }
        return ret
    },
    [Type.binary]: (node, context) => {
        const operator = node.operator

        if (operator === '|') {
            return {
                type: SlimType.anyOf,
                arguments: utils.spreadMember(node, operator).map(item => {
                    return table.router(item, context)
                })
            }
        }

        if (operator === '&') {
            return {
                type: SlimType.allOf,
                arguments: utils.spreadMember(node, operator).map(item => {
                    return table.router(item, context)
                })
            }
        }

        return {
            type: SlimType.binary,
            operator,
            left: table.router(node.left, context),
            right: table.router(node.right, context),
        } as BinarySlim
    },
    [Type.object]: (node, context) => {
        const ret = {
            type: SlimType.object,
            properties: [],
        } as ObjectSlim
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
                name: key.value,
                type: SlimType.property,
                value,
                optional: property.optional,
            } as PropertySlim

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
                item.description = desc
            }
            desc = ''

            if (key.type === Type.identifier && key.value === '$rest') {
                ret.rest = item
                continue
            }

            if (decorators.length) {
                item.decorators = []
                for (const decorate of decorators) {
                    item.decorators.push({
                        type: SlimType.decorate,
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
            const item: ItemSlim = {
                type: SlimType.item,
                name: arg.name,
            }
            if (arg.value) {
                item.value = arg.value
                index = arg.value
            } else {
                arg.value = index ++
            }
            args.push(item)
        }
        const ret = {
            type: SlimType.enum,
            enums: args,
        } as EnumSlim
        if (desc) {
            ret.description = desc
        }
        desc = ''
        return ret
    },
    [Type.match]: (node, context) => {
        return {
            type: SlimType.any,
        } as AnySlim
    },
    [Type.call]: (node, context) => {
        if (node.callee.value === 'oneOf') {
            return {
                type: SlimType.oneOf,
                arguments: node.arguments.map(arg => {
                    return table.router(arg, context)
                })
            } as OneOfSlim
        }
        if (node.callee.value === 'anyOf') {
            return {
                type: SlimType.anyOf,
                arguments: node.arguments.map(arg => {
                    return table.router(arg, context)
                })
            } as AnyOfSlim
        }
        if (node.callee.value === 'allOf') {
            return {
                type: SlimType.allOf,
                arguments: node.arguments.map(arg => {
                    return table.router(arg, context)
                })
            } as AllOfSlim
        }
        if (node.callee.value === 'definition' && node.arguments.length) {
            return {
                type: SlimType.definition,
                path: node.arguments[0].value.split('.')
            } as DefinitionSlim
        }
        return {
            type: SlimType.any,
        } as AnySlim
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
            type: SlimType.tuple,
            items: args,
        } as TupleSlim
    },
    [Type.array]: (node, context) => {
        return {
            type: SlimType.array,
            items: table.router(node.value, context),
        } as ArraySlim
    },
    [Type.self]: (node, context) => {
        return {
            type: SlimType.self,
        } as SelfSlim
    },
    [Type.regular]: (node, context) => {
        return {
            type: SlimType.regular,
            value: node.value,
        } as RegularSlim
    },
    [Type.identifier]: (node, context) => {
        if (types[node.value]) {
            return {
                type: node.value,
            } as Slim
        }
        return {
            type: SlimType.definition,
            path: [node.value],
        } as DefinitionSlim
    },
    [Type.rest]: (node, context) => {
        return {
            type: SlimType.any,
        } as AnySlim
    },
    [Type.optional]: (node, context) => {
        return {
            type: SlimType.any,
        } as AnySlim
    },
    [Type.element]: (node, context) => {
        let desc = ''
        let value
        const ret = {
            type: SlimType.element,
            declares: [],
            assign: null,
        } as ElementSlim
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
            type: SlimType.declare,
            path: node.path.map(path => {
                return path.value
            }),
            value: table.router(node.value, context)
        } as DeclareSlim
    },
    [Type.number]: (node, context) => {
        return {
            type: SlimType.const,
            value: node.value,
        } as ConstSlim
    },
    [Type.string]: (node, context) => {
        return {
            type: SlimType.const,
            value: node.value,
        } as ConstSlim
    },
    [Type.boolean]: (node, context) => {
        return {
            type: SlimType.const,
            value: node.value,
        } as ConstSlim
    },
}

export default (ast: Node[]) => {
    return table.start(ast)
}
