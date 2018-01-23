import * as lier from '../../interface'

const Type = lier.Type

const utils = {
    type: (value): string => {
        return Object.prototype.toString.call(value).slice(8, -1)
    },
    value: (type) => {
        if (!type) {
            return null
        }
        if (type.type === Type.type) {
            return utils.value(type.value)
        }
        return type
    },
    property: (object, key) => {
        if (!object || object.type !== Type.object) {
            return null
        }
        for (const property of object.properties) {
            if (property.key.value + '' === key) {
                return property
            }
        }
        return null
    },
    identifier: (value) => {
        return /^[a-zA-Z_][a-zA-Z_0-9$]*$/.test(value)
    },
    integer: (value): boolean => {
        value = +value
        return value <= utils.MAX_INTEGER && value >= utils.MIN_INTEGER && (value | 0) === value
    },
    MAX_INTEGER: Math.pow(2, 31) - 1,
    MIN_INTEGER: -Math.pow(2, 31),
    key: (key): lier.Node => {
        if (utils.integer(key)) {
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
                return {
                    type: Type.string,
                    value: key,
                } as lier.StringNode
            }
        }
        if (utils.identifier(key)) {
            return {
                type: Type.identifier,
                value: key,
            } as lier.IdentifierNode
        }
        return {
            type: Type.string,
            value: key,
        } as lier.StringNode
    },
    spread: (node): lier.Node[] => {
        node = utils.value(node)
        if (!node) {
            return []
        }
        if (node.type === Type.member) {
            if (node.property.length) {
                return []
            }
            node = utils.value(node.object)
        }
        let list = []
        if (node.type === Type.binary) {
            if (node.operator !== '|') {
                return []
            }
            list = list.concat(utils.spread(node.left))
            list = list.concat(utils.spread(node.right))
        } else {
            list.push(node)
        }
        return list
    },
}

export default utils