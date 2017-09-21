// Forked from: https://github.com/substack/object-inspect

import br from './brush'

const hasMap = typeof Map === 'function' && Map.prototype
const mapSizeDescriptor = Object.getOwnPropertyDescriptor && hasMap ? Object.getOwnPropertyDescriptor(Map.prototype, 'size') : null
const mapSize = hasMap && mapSizeDescriptor && typeof mapSizeDescriptor.get === 'function' ? mapSizeDescriptor.get : null
const mapForEach = hasMap && Map.prototype.forEach
const hasSet = typeof Set === 'function' && Set.prototype
const setSizeDescriptor = Object.getOwnPropertyDescriptor && hasSet ? Object.getOwnPropertyDescriptor(Set.prototype, 'size') : null
const setSize = hasSet && setSizeDescriptor && typeof setSizeDescriptor.get === 'function' ? setSizeDescriptor.get : null
const setForEach = hasSet && Set.prototype.forEach
const booleanValueOf = Boolean.prototype.valueOf
const isBrowser = eval(`typeof window === 'object'`)
const root = eval(`isBrowser ? window : global`)

const spaces = genSpace(100)

function genSpace (n: number) {
    let ret = ''
    for (let i = 0; i < n; i++) {
        ret += ' '
    }
    return ret
}

function space (n: number, indent: number): string {
    n *= indent
    if (n < spaces.length)
        return spaces.slice(0, n)
    else
        return genSpace(n)
}

export default function inspect_ (obj, opts?, depth?, seen?): string {
    if (!opts) opts = {}

    const maxDepth = opts.depth === undefined ? 10 : opts.depth
    const indent = opts.indent === undefined ? 4 : opts.indent
    const ln = indent ? '\n' : ' '

    if (depth === undefined) depth = 0
    if (depth >= maxDepth && maxDepth > 0 && obj && typeof obj === 'object') {
        return br.italic('[Object...]')
    }

    if (seen === undefined) seen = []
    else if (indexOf(seen, obj) >= 0) {
        return br.italic('[Circular...]')
    }

    function inspect (value, from?) {
        if (from) {
            seen = seen.slice()
            seen.push(from)
        }
        return inspect_(value, opts, depth + 1, seen)
    }

    if (typeof obj === 'string') {
        return br.magenta(inspectString(obj))
    }
    else if (typeof obj === 'function') {
        const name = nameOf(obj)
        return br.green('[Function' + (name ? ': ' + name : '') + ']')
    }
    else if (obj === null) {
        return br.blue('null')
    }
    else if (obj === true || obj === false || obj === undefined) {
        return br.blue(String(obj))
    }
    else if (typeof obj === 'number') {
        return br.yellow(String(obj))
    }
    else if (isSymbol(obj)) {
        const symString = Symbol.prototype.toString.call(obj)
        return br.yellow(typeof obj === 'object' ? 'Object(' + symString + ')' : symString)
    }
    else if (isElement(obj)) {
        let s = '<' + String(obj.nodeName).toLowerCase()
        const attrs = obj.attributes || []
        for (let i = 0; i < attrs.length; i++) {
            s += ' ' + attrs[i].name + '="' + quote(attrs[i].value) + '"'
        }
        s += '>'
        if (obj.childNodes && obj.childNodes.length) s += '...'
        s += '</' + String(obj.nodeName).toLowerCase() + '>'
        return br.green(s)
    }
    else if (isArray(obj)) {
        if (obj.length === 0) return '[]'
        const xs = Array(obj.length)
        for (let i = 0; i < obj.length; i++) {
            xs[i] = has(obj, i) ? (space(depth + 1, indent) + inspect(obj[i], obj)) : ''
        }

        const cname = obj.constructor.name && obj.constructor.name !== 'Array' ?
            br.green(obj.constructor.name) + ' ' : ''

        return cname + '[' + ln + xs.join(',' + ln) + ln + space(depth, indent) + ']'
    }
    else if (isError(obj)) {
        const parts = []
        for (const key in obj) {
            if (!has(obj, key)) continue

            if (/[^\w$]/.test(key)) {
                parts.push(inspect(key) + ': ' + inspect(obj[key]))
            }
            else {
                parts.push(key + ': ' + inspect(obj[key]))
            }
        }
        if (parts.length === 0) return br.red('[' + obj + ']')
        return '{ [' + obj + '] ' + parts.join(', ') + ' }'
    }
    else if (typeof obj === 'object' && typeof obj.inspect === 'function') {
        return obj.inspect(opts, depth)
    }
    else if (isMap(obj)) {
        const parts = []
        mapForEach.call(obj, function (value, key) {
            parts.push(space(depth + 1, indent) + inspect(key, obj) + ' => ' + inspect(value, obj))
        })
        return br.green('Map') + ' (' + mapSize.call(obj) + ') {' + ln + parts.join(',' + ln) + ln + space(depth, indent) + '}'
    }
    else if (isSet(obj)) {
        const parts = []
        setForEach.call(obj, function (value ) {
            parts.push(space(depth + 1, indent) + inspect(value, obj))
        })
        return br.green('Set') + ' (' + setSize.call(obj) + ') {' + ln + parts.join(',' + ln) + ln + space(depth, indent) + '}'
    }
    else if (typeof obj !== 'object') {
        return String(obj)
    }
    else if (isNumber(obj)) {
        return br.green('Object(' + Number(obj) + ')')
    }
    else if (isBoolean(obj)) {
        return br.green('Object(' + booleanValueOf.call(obj) + ')')
    }
    else if (isString(obj)) {
        return br.green('Object(' + inspect(String(obj)) + ')')
    }
    else if (isDate(obj)) {
        return br.yellow(String(obj))
    }
    else if (isRegExp(obj)) {
        return br.magenta(String(obj))
    }
    else {
        const xs = [], keys = []
        for (const key in obj) {
            if (has(obj, key)) keys.push(key)
        }
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i] as string
            xs.push(space(depth + 1, indent) + br.cyan(key + ': ') + inspect(obj[key], obj))
        }
        if (xs.length === 0) return '{}'

        const cname = obj.constructor.name && obj.constructor.name !== 'Object' ?
            br.green(obj.constructor.name) + ' ' : ''

        return cname + '{' + ln
            + xs.join(',' + ln)
            + ln + space(depth, indent) + '}'
    }
}

function quote (s) {
    return String(s).replace(/"/g, '&quot;')
}

function isArray (obj) { return toStr(obj) === '[object Array]' }
function isDate (obj) { return toStr(obj) === '[object Date]' }
function isRegExp (obj) { return toStr(obj) === '[object RegExp]' }
function isError (obj) { return toStr(obj) === '[object Error]' }
function isSymbol (obj) { return toStr(obj) === '[object Symbol]' }
function isString (obj) { return toStr(obj) === '[object String]' }
function isNumber (obj) { return toStr(obj) === '[object Number]' }
function isBoolean (obj) { return toStr(obj) === '[object Boolean]' }

const hasOwn = Object.prototype.hasOwnProperty || function (key) { return key in this }
function has (obj, key) {
    return hasOwn.call(obj, key)
}

function toStr (obj) {
    return Object.prototype.toString.call(obj)
}

function nameOf (f) {
    if (f.name) return f.name
    const m = String(f).match(/^function\s*([\w$]+)/)
    if (m) return m[1]
}

function indexOf (xs, x) {
    if (xs.indexOf) return xs.indexOf(x)
    for (let i = 0, l = xs.length; i < l; i++) {
        if (xs[i] === x) return i
    }
    return -1
}

function isMap (x) {
    if (!mapSize) {
        return false
    }
    try {
        mapSize.call(x)
        return true
    } catch (e) {}
    return false
}

function isSet (x) {
    if (!setSize) {
        return false
    }
    try {
        setSize.call(x)
        return true
    } catch (e) {}
    return false
}

function isElement (x) {
    if (!x || typeof x !== 'object') return false
    if (root['HTMLElement'] && x instanceof root['HTMLElement']) {
        return true
    }
    return typeof x.nodeName === 'string'
        && typeof x.getAttribute === 'function'

}

function inspectString (str) {
    const s = str.replace(/(['\\])/g, '\\$1').replace(/[\x00-\x1f]/g, lowbyte)
    return '\'' + s + '\''

    function lowbyte (c) {
        const n = c.charCodeAt(0)
        const x = { 8: 'b', 9: 't', 10: 'n', 12: 'f', 13: 'r' }[n]
        if (x) return '\\' + x
        return '\\x' + (n < 0x10 ? '0' : '') + n.toString(16)
    }
}
