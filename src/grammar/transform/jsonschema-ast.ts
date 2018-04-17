import * as lier from '../interface'

const Type = lier.Type

const convert = (data) => {
    if (data == null) {
        return convertNull(data)
    }

    if (data.enum) {
        return convertEnum(data)
    }
    const type = data.type

    if (type === 'string') {
        return convertString(data)
    }

    if (type === 'integer') {
        return convertInteger(data)
    }

    if (type === 'number') {
        return convertNumber(data)
    }

    if (type === 'boolean') {
        return convertBoolean(data)
    }

    if (data.type === 'null') {
        return convertNull(data)
    }

    if (type === 'array' || data.items) {
        return convertArray(data)
    }

    if (data.$ref) {
        return convertRef(data)
    }

    if (data.oneOf) {
        return convertOneOf(data)
    }

    if (data.anyOf) {
        return convertAnyOf(data)
    }

    if (data.allOf) {
        return convertAllOf(data)
    }

    if (type === 'object' || data.properties || data.hasOwnProperty('definitions')) {
        return convertObject(data)
    }

    return directConvert(data)
}

const isnumber = (value) => {
    return !isNaN(+value)
}

const isidentifier = (value) => {
    return /^[a-zA-Z_][a-zA-Z_0-9$]*$/.test(value)
}

const getType = (value) => {
    return Object.prototype.toString.call(value).slice(8, -1)
}

const convertKey = (key): any => {
    if (isnumber(key)) {
        return {
            type: Type.number,
            value: +key,
        } as lier.NumberNode
    }
    const match = key.match(/^\/(.*)\/(img)*$/)
    if (match) {
        try {
            return {
                type: Type.regular,
                value: new RegExp(match[0], match[1]),
            } as lier.RegularNode
        } catch (exp) {
        }
    }
    if (isidentifier(key)) {
        return {
            type: Type.identifier,
            value: key,
        } as lier.IdentifierNode
    }
    return {
        type: Type.string,
        value: key,
    } as lier.StringNode
}

const convertNull = (data) => {
    return {
        type: lier.Type.null,
    } as lier.NullNode
}

const convertString = (data) => {
    return convertExport(data, {
        type: Type.identifier,
        value: 'str',
    } as lier.IdentifierNode)
}

const convertInteger = (data) => {
    const format = {
        int32: 'int',
        int64: 'long',
    }
    return convertExport(data, {
        type: Type.identifier,
        value: format[data.format] || 'int',
    } as lier.IdentifierNode)
}

const convertNumber = (data) => {
    return convertExport(data, {
        type: Type.identifier,
        value: 'number',
    } as lier.IdentifierNode)
}

const convertBoolean = (data) => {
    return convertExport(data, {
        type: Type.identifier,
        value: 'bool',
    } as lier.IdentifierNode)
}

const convertEnum = (data) => {
    const args = []
    for (const item of data.enum) {
        args.push(convert(item))
    }
    return convertExport(data, {
        type: Type.enum,
        arguments: args,
    } as lier.EnumNode)
}

const convertArray = (data) => {
    if (!data.items) {
        return {
            type: Type.tuple,
            value: [],
        } as lier.TupleNode
    }
    return convertExport(data, {
        type: Type.array,
        value: convert(data.items),
    } as lier.ArrayNode)
}

const convertObject = (data) => {
    const properties = []
    const object = data.properties
    const required = data.required || []
    if (object) {
        for (const key of Object.keys(object)) {
            const value = object[key]
            const decorators = []
            if (value) {
                pushDescription(decorators, value)
                pushRange(decorators, value)
            }
            properties.push({
                type: Type.property,
                decorators,
                optional: data.isDefinitions ? false : required.indexOf(key) === -1,
                key: convertKey(key),
                value: convert(value),
            } as lier.PropertyNode)
        }
    }
    if (data.hasOwnProperty('definitions')) {
        properties.push({
            decorators: [],
            optional: false,
            key: {
                type: Type.identifier,
                value: '$definitions',
            },
            value: convert({
                properties: data.definitions,
                isDefinitions: true,
            }),
        })
    }
    if (data.hasOwnProperty('additionalProperties')) {
        properties.push({
            decorators: [],
            optional: false,
            key: {
                type: Type.identifier,
                value: '$rest',
            },
            value: data.additionalProperties ? convert(data.additionalProperties) : {
                type: Type.type,
                value: {
                    type: Type.identifier,
                    value: 'never',
                }
            },
        })
    }
    return {
        type: Type.object,
        properties,
    } as lier.ObjectNode
}

const convertRef = (data) => {
    const path = data.$ref.split('/')
    path.shift()
    const node = path.reduce((result, element) => {
        let properties = []
        if (isidentifier(element)) {
            properties.push({
                type: Type.identifier,
                value: element === 'definitions' ? '$definitions' : element,
            } as lier.IdentifierNode)
        } else if (isnumber(element)) {
            properties.push({
                type: Type.number,
                value: +element,
            } as lier.NumberNode)
        } else {
            properties.push({
                type: Type.string,
                value: element,
            } as lier.StringNode)
        }
        return {
            type: Type.member,
            object: result,
            properties,
        } as lier.MemberNode
    }, {
        type: Type.this,
    } as lier.ThisNode)
    return convertExport(data, node)
}

const convertOneOf = (data) => {
    const object = data.oneOf
    const args = []
    for (const key of Object.keys(object)) {
        args.push(convert(object[key]))
    }
    return convertExport(data, {
        type: Type.call,
        callee: {
            type: Type.identifier,
            value: 'oneOf',
        } as lier.IdentifierNode,
        arguments: args,
    } as lier.CallNode)
}

const convertAnyOf = (data) => {
    const object = data.anyOf
    const args = []
    for (const key of Object.keys(object)) {
        args.push(convert(object[key]))
    }
    if (!args.length) {
        return {
            type: Type.identifier,
            value: 'any',
        } as lier.IdentifierNode
    }
    const top = args.shift()
    const node = args.reduce((result, element) => {
        return {
            type: Type.binary,
            operator: '|',
            left: result,
            right: element,
        } as lier.BinaryNode
    }, top)
    return convertExport(data, node)
}

const convertAllOf = (data) => {
    const object = data.allOf
    const args = []
    for (const key of Object.keys(object)) {
        args.push(convert(object[key]))
    }
    if (!args.length) {
        return {
            type: Type.identifier,
            value: 'any',
        } as lier.IdentifierNode
    }
    const top = args.shift()
    const node = args.reduce((result, element) => {
        return {
            type: Type.binary,
            operator: '&',
            left: result,
            right: element,
        } as lier.BinaryNode
    }, top)
    return convertExport(data, node)
}

const convertExport = (data, property) => {
    if (!data.hasOwnProperty('definitions')) {
        return property
    }
    return {
        type: Type.object,
        properties: [
            {
                decorators: [],
                optional: false,
                key: {
                    type: Type.identifier,
                    value: '$definitions',
                },
                value: convert({
                    properties: data.definitions,
                    isDefinitions: true,
                }),
            },
            {
                type: Type.property,
                decorators: [],
                optional: false,
                key: {
                    type: Type.identifier,
                    value: '$export',
                } as lier.Node,
                value: property,
            } as lier.PropertyNode
        ],
    } as lier.ObjectNode
}

const pushRange = (decorators, value) => {
    let items = []
    if (value.hasOwnProperty('minItems') && value.hasOwnProperty('maxItems')) {
        items = [
            {
                type: Type.number,
                value: value.minItems,
            } as lier.NumberNode,
            {
                type: Type.number,
                value: value.maxItems,
            } as lier.NumberNode,
        ]
    } else if (value.hasOwnProperty('minItems')) {
        items = [
            {
                type: Type.number,
                value: value.minItems,
            } as lier.NumberNode,
            {
                type: Type.identifier,
                value: 'Infinity',
            } as lier.IdentifierNode,
        ]
    } else if (value.hasOwnProperty('maxItems')) {
        items = [
            {
                type: Type.number,
                value: value.maxItems,
            } as lier.NumberNode,
        ]
    } else if (value.hasOwnProperty('minimum') && value.hasOwnProperty('maximum')) {
        items = [
            {
                type: Type.number,
                value: value.minimum,
            } as lier.NumberNode,
            {
                type: Type.number,
                value: value.maximum,
            } as lier.NumberNode,
        ]
    } else if (value.hasOwnProperty('minimum')) {
        items = [
            {
                type: Type.number,
                value: value.minimum,
            } as lier.NumberNode,
            {
                type: Type.identifier,
                value: 'Infinity',
            } as lier.IdentifierNode,
        ]
    } else if (value.hasOwnProperty('maximum')) {
        items = [
            {
                type: Type.number,
                value: value.maximum,
            } as lier.NumberNode,
        ]
    }
    if (items.length) {
        decorators.push({
            type: Type.decorator,
            name: 'range',
            arguments: items,
        } as lier.DecoratorNode)
    }
}

const pushDescription = (decorators, value) => {
    if (value.description) {
        decorators.push({
            type: Type.decorator,
            name: '_',
            arguments: [
                {
                    type: Type.string,
                    value: value.description,
                } as lier.StringNode,
            ],
        } as lier.DecoratorNode)
    }
    if (value.items && value.items.description) {
        decorators.push({
            type: Type.decorator,
            name: '_',
            arguments: [
                {
                    type: Type.string,
                    value: value.items.description,
                } as lier.StringNode,
            ],
        } as lier.DecoratorNode)
    }
}

const directConvert = (data): any => {
    if (data == null) {
        return convertNull(data)
    }

    const type = getType(data)

    if (type === 'String') {
        return {
            type: Type.string,
            value: data,
        } as lier.StringNode
    }

    if (type === 'Number') {
        return {
            type: Type.number,
            value: data,
        } as lier.NumberNode
    }

    if (type === 'Boolean') {
        return {
            type: Type.boolean,
            value: data,
        } as lier.BooleanNode
    }

    if (type === 'Array') {
        return directConvertArray(data)
    }

    if (type === 'Object') {
        return directConvertObject(data)
    }

    return convertNull(data)
}

const directConvertArray = (data) => {
    const items = []
    for (const item of data) {
        items.push(convert(item))
    }
    return {
        type: Type.tuple,
        value: items,
    } as lier.TupleNode
}

const directConvertObject = (data) => {
    const properties = []
    for (const key of Object.keys(data)) {
        properties.push({
            type: Type.property,
            decorators: [],
            optional: false,
            key: convertKey(key),
            value: convert(data[key]),
        } as lier.PropertyNode)
    }
    return {
        type: Type.object,
        properties,
    } as lier.ObjectNode
}

export default convert
