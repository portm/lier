import * as _ from 'lodash'
import utils from '../utils'
import * as lier from '../interface'

const Type = lier.Type

const format = {
    int32: 'int',
    int64: 'long',
}

interface Context {
    declares: any[]
    path: string[]
}

const convert = (data, context: Context) => {
    if (data == null) {
        return convertNull(data, context)
    }

    if (data.enum) {
        return convertEnum(data, context)
    }
    const type = data.type

    if (data.format) {
        return convertFormat(data, context)
    }

    if (data.$ref) {
        return convertRef(data, context)
    }

    if (data.oneOf) {
        return convertOneOf(data, context)
    }

    if (data.anyOf) {
        return convertAnyOf(data, context)
    }

    if (data.allOf) {
        return convertAllOf(data, context)
    }

    if (type === 'string') {
        return convertString(data, context)
    }

    if (type === 'integer') {
        return convertInteger(data, context)
    }

    if (type === 'number') {
        return convertNumber(data, context)
    }

    if (type === 'boolean') {
        return convertBoolean(data, context)
    }

    if (data.type === 'null') {
        return convertNull(data, context)
    }

    if (type === 'array' || data.items) {
        return convertArray(data, context)
    }

    if (type === 'object' || data.properties || data.hasOwnProperty('definitions')) {
        return convertObject(data, context)
    }

    return directConvert(data, context)
}

const convertNull = (data, context: Context) => {
    return {
        type: lier.Type.null,
    } as lier.NullNode
}

const convertFormat = (data, context: Context) => {
    let type = format[data.format]
    if (type) {
        return utils.makeType(type)
    }
    if (data.type === 'string') {
        return utils.makeType('str')
    }

    if (data.type === 'integer') {
        return utils.makeType('int')
    }

    if (data.type === 'number') {
        return utils.makeType('number')
    }

    if (data.type === 'boolean') {
        return utils.makeType('bool')
    }
    return utils.makeType('any')
}

const convertString = (data, context: Context) => {
    convertExport(data, context)
    if (data.pattern) {
        return {
            type: Type.regular,
            value: new RegExp(data.pattern)
        }
    }
    return utils.makeType('str')
}

const convertInteger = (data, context: Context) => {
    convertExport(data, context)
    return utils.makeType('int')
}

const convertNumber = (data, context: Context) => {
    convertExport(data, context)
    return utils.makeType('number')
}

const convertBoolean = (data, context: Context) => {
    convertExport(data, context)
    return utils.makeType('bool')
}

const convertEnum = (data, context: Context) => {
    const args = []
    for (const item of data.enum) {
        args.push(convert(item, context))
    }
    convertExport(data, context)
    return {
        type: Type.enum,
        arguments: args,
    } as lier.EnumNode
}

const convertArray = (data, context: Context) => {
    if (!data.items) {
        return {
            type: Type.tuple,
            value: [],
        } as lier.TupleNode
    }
    convertExport(data, context)
    return {
        type: Type.array,
        value: convert(data.items, context),
    } as lier.ArrayNode
}

const convertObject = (data, context: Context) => {
    const properties = []
    const object = data.properties
    const required = data.required || []
    if (object) {
        for (const key of Object.keys(object)) {
            const value = object[key]
            const decorators = []
            pushDescription(properties, value)
            pushRange(decorators, value)
            properties.push({
                type: Type.property,
                decorators,
                optional: required.indexOf(key) === -1,
                key: utils.makeKey(key),
                value: convert(value, context),
            } as lier.PropertyNode)
        }
    }
    if (data.hasOwnProperty('additionalProperties')) {
        properties.push({
            type: Type.property,
            decorators: [],
            optional: false,
            key: {
                type: Type.identifier,
                value: '$rest',
            },
            value: data.additionalProperties ? convert(data.additionalProperties, context) : utils.makeType('never'),
        })
    }
    convertExport(data, context)
    return {
        type: Type.object,
        properties,
    } as lier.ObjectNode
}

const convertRef = (data, context: Context) => {
    const path = data.$ref.split('/')
    path.shift()
    convertExport(data, context)

    if (path[0] === 'definitions') {
        path.shift()
    }
    
    return path.reduce((result, element) => {
        if (element === 'definitions') {
            return result
        }
        let properties = result.type === Type.member ? result.properties: []
        if (utils.isIdentifier(element)) {
            properties.push({
                type: Type.identifier,
                value: element,
            } as lier.IdentifierNode)
        } else if (utils.isNumber(element)) {
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
        if (result.type === Type.member) {
            return result
        }
        return {
            type: Type.member,
            object: result,
            properties,
        } as lier.MemberNode
    }, utils.makeType(path.shift()))
}

const convertOneOf = (data, context: Context) => {
    const object = data.oneOf
    const args = []
    for (const key of Object.keys(object)) {
        args.push(convert(object[key], context))
    }
    convertExport(data, context)
    return {
        type: Type.call,
        callee: utils.makeType('oneOf'),
        arguments: args,
    } as lier.CallNode
}

const convertAnyOf = (data, context: Context) => {
    const object = data.anyOf
    const args = []
    for (const key of Object.keys(object)) {
        args.push(convert(object[key], context))
    }
    if (!args.length) {
        return utils.makeType('any')
    }
    const top = args.shift()
    convertExport(data, context)
    return args.reduce((result, element) => {
        return {
            type: Type.binary,
            operator: '|',
            left: result,
            right: element,
        } as lier.BinaryNode
    }, top)
}

const convertAllOf = (data, context: Context) => {
    const object = data.allOf
    const args = []
    for (const key of Object.keys(object)) {
        args.push(convert(object[key], context))
    }
    if (!args.length) {
        return utils.makeType('any')
    }
    const top = args.shift()
    convertExport(data, context)
    return args.reduce((result, element) => {
        return {
            type: Type.binary,
            operator: '&',
            left: result,
            right: element,
        } as lier.BinaryNode
    }, top)
}

const convertExport = (data, context: Context) => {
    if (!data.hasOwnProperty('definitions')) {
        return
    }
    const definitions = data.definitions
    for (const key of Object.keys(definitions)) {
        const value = definitions[key]
        context.path.push(key)
        const members = context.path.slice()
        pushDescription(context.declares, value)
        context.declares.push({
            type: Type.declare,
            path: members.map(member => {
                if (utils.isIdentifier(member)) {
                    return {
                        type: Type.identifier,
                        value: member,
                    } as lier.IdentifierNode
                } else if (utils.isNumber(member)) {
                    return {
                        type: Type.number,
                        value: +member,
                    } as lier.NumberNode
                } else {
                    return {
                        type: Type.string,
                        value: member,
                    } as lier.StringNode
                }
            }),
            value: convert(value, context),
        })
        context.path.pop()
    }
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
            utils.makeType('Infinity')
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
            utils.makeType('Infinity')
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

const pushDescription = (nodes, value) => {
    if (!value) {
        return
    }
    if (value.description) {
        nodes.push({
            type: Type.comment,
            value: value.description,
        } as lier.CommentNode)
    }
    if (value.items && value.items.description) {
        nodes.push({
            type: Type.comment,
            value: value.items.description,
        } as lier.CommentNode)
    }
}

const directConvert = (data, context: Context): any => {
    if (data == null) {
        return convertNull(data, context)
    }

    const type = utils.getType(data)

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
        return directConvertArray(data, context)
    }

    if (type === 'Object') {
        return directConvertObject(data, context)
    }

    return convertNull(data, context)
}

const directConvertArray = (data, context: Context) => {
    const items = []
    for (const item of data) {
        items.push(convert(item, context))
    }
    return {
        type: Type.tuple,
        value: items,
    } as lier.TupleNode
}

const directConvertObject = (data, context: Context) => {
    const properties = []
    for (const key of Object.keys(data)) {
        properties.push({
            type: Type.property,
            decorators: [],
            optional: false,
            key: utils.makeKey(key),
            value: convert(data[key], context),
        } as lier.PropertyNode)
    }
    return {
        type: Type.object,
        properties,
    } as lier.ObjectNode
}

export default (data) => {
    const context = {
        declares: [],
        path: [],
    }
    const ast = convert(data, context)
    if (!ast) {
        return []
    }
    pushDescription(context.declares, data)
    return [{
        type: Type.element,
        declarations: context.declares,
        assignment: ast,
    }]
}