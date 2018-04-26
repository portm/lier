import * as lier from './interface'

const Type = lier.Type

const utils = {
    getType: (value): string => {
        return Object.prototype.toString.call(value).slice(8, -1)
    },
    isIdentifier: (value) => {
        return /^[a-zA-Z_][a-zA-Z_0-9$]*$/.test(value)
    },
    isInteger: (value): boolean => {
        value = +value
        return value <= utils.MAX_INTEGER && value >= utils.MIN_INTEGER && (value | 0) === value
    },
    isNumber: (value): boolean => {
        return !isNaN(+value)
    },
    MAX_INTEGER: Math.pow(2, 31) - 1,
    MIN_INTEGER: -Math.pow(2, 31),
    makeKey: (key): lier.Node => {
        if (utils.isInteger(key)) {
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
        if (utils.isIdentifier(key)) {
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
    spreadMember: (node, operator): lier.Node[] => {
        if (!node) {
            return []
        }
        if (node.type !== Type.binary || node.operator !== operator) {
            return [node]
        }
        return utils.spreadMember(node.left, operator).concat(utils.spreadMember(node.right, operator))
    },
    makeType: (node): lier.TypeNode => {
        return {
            type: Type.type,
            value: node,
        }
    }
}

export default utils