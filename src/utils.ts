import * as _ from 'lodash'
import * as RandExp from 'randexp'


const isKeyPatternReg = /^\/[^\/]/
const keyPatternReg = /^\/([^\/][\s\S]*)\/([igmuy]*)$/
const isControlKeyReg = /^\$[^\$]/
const MAX_SAFE_INTEGER = 9007199254740991
const MIN_SAFE_INTEGER = -9007199254740991

const self = {
    MAX_SAFE_INTEGER,
    MIN_SAFE_INTEGER,

    isControlKey (str: string) {
        return isControlKeyReg.test(str)
    },

    isPatternKey (str: string) {
        return isKeyPatternReg.test(str)
    },

    matchKeyPattern (str: string) {
        return str.match(keyPatternReg)
    },

    unescapeControlKey (key: string): string {
        if (key.length > 1 &&
        (
                (key[0] === '/' && key[1] === '/') ||
                (key[0] === '$' && key[1] === '$')
        )
        )
            return key.slice(1)
        else
            return key
    },

    randStr () {
        return Math.random().toString(36).substring(7)
    },

    isUndefined (val): val is undefined {
        return val === void 0
    },

    isString (val): val is string {
        return typeof val === 'string' || val instanceof String
    },

    isNumber (val): val is number {
        return typeof val === 'number' || val instanceof Number
    },

    isArray (val): val is any[] {
        return Array.isArray(val)
    },

    isObjectLike (val): val is Object {
        return val !== null && typeof val === 'object'
    },

    isRegExp (val): val is RegExp {
        return val instanceof RegExp
    },

    isBoolean (val): val is boolean {
        return typeof val === 'boolean' || val instanceof Boolean
    },

    isDate (val): val is Date {
        return val instanceof Date
    },

    isFunction (val): val is Function {
        return typeof val === 'function'
    },

    isInteger (val): val is number {
        if (_.isInteger(val)) {
            return true
        }

        if (!/^[-+]?\d+$/.test(val)) {
            return false
        }

        return val > MAX_SAFE_INTEGER || val < MIN_SAFE_INTEGER
    },

    random (min, max) {
        return _.random(min, max)
    },

    merge (target, source) {
        if (self.isObjectLike(target) && self.isObjectLike(source)) {
            for (const key in source) {
                if (self.isObjectLike(source[key])) {
                    if (!target[key]) _.assign(target, { [key]: {} })
                    self.merge(target[key], source[key])
                } else {
                    _.assign(target, { [key]: source[key] })
                }
            }
        }
        return target
    },

    get: _.get,

    isEqual: _.isEqual,

    randExp (reg, flag?) {
        return new RandExp(reg, flag).gen()
    },
}

export default self
