import * as lier from '../../interface'
import utils from './utils'

declare let Set

const Type = lier.Type

interface Context {
    data: any
    brother?: any
}

interface Convertor {
    router: (context: Context) => lier.Node
    [operator: string]: (context: Context) => lier.Node
}

const assertContext = (context: Context, type: string) => {
    return utils.type(context.brother) === type
}

const convertor: Convertor = {
    router: (context: Context): lier.Node => {
        if (!context || context.data == null) {
            return convertor.null(context)
        }
    
        const type = utils.type(context.data)
    
        if (type === 'String') {
            return convertor.string(context)
        }
    
        if (type === 'Number') {
            return convertor.number(context)
        }
    
        if (type === 'Boolean') {
            return convertor.boolean(context)
        }
    
        if (type === 'Array') {
            return convertor.array(context)
        }
    
        if (type === 'Object') {
            return convertor.object(context)
        }
    
        return convertor.null(context)
    },
    null: (context: Context): lier.Node => {
        if (context.brother === null) {
            return null
        }
        return {
            type: lier.Type.null,
        } as lier.NullNode
    },
    string: (context: Context): lier.Node => {
        if (assertContext(context, 'String')) {
            return null
        }
        return {
            type: Type.identifier,
            value: 'str',
        } as lier.IdentifierNode
    },
    number: (context: Context): lier.Node => {
        const value = context.data
        const integer = utils.integer(value)
        if (assertContext(context, 'Number')) {
            const oldInteger = utils.integer(context.brother)
            if ((integer && oldInteger || !integer && !oldInteger)) {
                return null
            }
        }
        return {
            type: Type.identifier,
            value: integer ? 'int' : 'number',
        } as lier.IdentifierNode
    },
    boolean: (context: Context): lier.Node => {
        if (assertContext(context, 'Boolean')) {
            return null
        }
        return {
            type: Type.identifier,
            value: 'bool',
        } as lier.IdentifierNode
    },
    array: (context: Context): lier.Node => {
        const array = context.data
        const unities = []
        for (const data of array) {
            let last = null
            for (const unity of unities) {
                const node = convertor.router({
                    data,
                    brother: unity.data,
                })
                if (!node) {
                    last = null
                    break
                }
                last = node
            }
            if (last) {
                unities.push({
                    type: last,
                    data,
                })
            } else if (!unities.length) {
                unities.push({
                    type: convertor.router({
                        data,
                    }),
                    data,
                })
            }
        }
        // zip origin array
        array.length = unities.length
        const types = []
        for (let i = 0; i < unities.length; ++ i) {
            array[i] = unities[i].data
            types[i] = unities[i].type
        }
        if (assertContext(context, 'Array') && context.brother.length === unities.length) {
            let count = 0
            for (const unity of unities) {
                for (const oldData of context.brother) {
                    const node = convertor.router({
                        data: unity.data,
                        brother: oldData,
                    })
                    if (!node) {
                        ++ count
                        break
                    }
                }
            }
            if (count === unities.length) {
                return null
            }
        }
        if (!types.length) {
            return {
                type: Type.tuple,
                value: [],
            } as lier.TupleNode
        }
        return {
            type: Type.array,
            value: types.reduce((result, element) => {
                return {
                    type: Type.binary,
                    left: result,
                    right: element,
                    operator: '|',
                } as lier.BinaryNode
            }, types.shift()),
        } as lier.ArrayNode
    },
    object: (context: Context): lier.Node => {
        const object = context.data
        let keys = Object.keys(object)
        const oldKeys = Object.keys(context.brother || {})
        const properties = []
        if (context.brother && keys.length === oldKeys.length) {
            let equals = []
            // TODO: fix unstable sort
            for (const key of keys) {
                const node = convertor.router({
                    data: object[key],
                    brother: context.brother[key],
                })
                if (node) {
                    properties.push({
                        type: Type.property,
                        decorators: [],
                        optional: false,
                        key: utils.key(key),
                        value: node,
                    } as lier.PropertyNode)
                } else {
                    equals.push(key)
                }
            }
            if (equals.length === keys.length) {
                return null
            }
            keys = equals
        }
        for (const key of keys) {
            properties.push({
                type: Type.property,
                decorators: [],
                optional: false,
                key: utils.key(key),
                value: convertor.router({
                    data: object[key],
                }),
            } as lier.PropertyNode)
        }
        return {
            type: Type.object,
            properties,
        } as lier.ObjectNode
    },
}

export default (data): lier.Node => {
    const node = convertor.router({
        data,
    })
    return node
}
