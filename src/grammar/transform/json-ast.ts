import { compile } from '../'
import validate from '../../validate'
import * as lier from '../interface'

const Type = lier.Type

const convert = (data) => {
    if (data == null) {
        return convertNull(data)
    }

    const type = getType(data)

    if (type === 'String') {
        return convertString(data)
    }

    if (type === 'Number') {
        return convertNumber(data)
    }

    if (type === 'Boolean') {
        return convertBoolean(data)
    }

    if (type === 'Array') {
        return convertArray(data)
    }

    if (type === 'Object') {
        return convertObject(data)
    }

    return convertNull(data)
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
        type: Type.type,
        value: {
            type: lier.Type.null,
        } as lier.IdentifierNode,
    } as lier.TypeNode
}

const convertString = (data) => {
    return {
        type: Type.type,
        value: {
            type: Type.identifier,
            value: 'str',
        } as lier.IdentifierNode,
    } as lier.TypeNode
}

const convertInteger = (data) => {
    return {
        type: Type.type,
        value: {
            type: Type.identifier,
            value: 'int',
        } as lier.IdentifierNode,
    } as lier.TypeNode
}

const convertNumber = (data) => {
    return {
        type: Type.type,
        value: {
            type: Type.identifier,
            value: 'number',
        } as lier.IdentifierNode,
    } as lier.TypeNode
}

const convertBoolean = (data) => {
    return {
        type: Type.type,
        value: {
            type: Type.identifier,
            value: 'bool',
        } as lier.IdentifierNode,
    } as lier.TypeNode
}

const convertArray = (data): any => {
    const types = []
    const caches = []
    for (const item of data) {
        const node = convert(item)
        let flag = true
        for (const type of caches) {
            if (!validate(item, type)) {
                flag = false
            }
        }
        if (flag) {
            types.push(node)
            caches.push(compile(node))
        }
    }
    if (!types.length) {
        return {
            type: Type.array,
            value: [],
        } as lier.ArrayNode
    }
    return {
        type: Type.member,
        object: types.reduce((result, element) => {
            return {
                type: Type.binary,
                left: result,
                right: element,
                operator: '|',
            } as lier.BinaryNode
        }, types.shift()),
        property: [],
    } as lier.MemberNode
}

const convertObject = (data) => {
    const properties = []
    for (const key of Object.keys(data)) {
        properties.push({
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
