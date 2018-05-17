import * as Big from 'big.js'
import inspect from './inspect'
import { Context, LierError, Root, Type } from './interfaces'
import _ from './utils'
import validate from './validate'
import utils from './utils'

function bool (ctx: Context): any {
    if (ctx.root.isMock)
        return _.random(0, 1) === 1

    if (!_.isBoolean(ctx.data))
        return [ctx.data, 'is not boolean']
}

function int (bits: number) {
    const min = Big(2).pow(bits - 1).times(-1)
    const max = Big(2).pow(bits - 1).minus(1)
    const name = `int` + bits

    const fn = function (ctx: Context): any {
        if (ctx.root.isMock)
            return _.random(-127, 127)

        let v = ctx.data

        if (!_.isInteger(v))
            return [v, 'is not an integer']

        v = Big(v)
        if (max.lt(v) || min.gt(v)) {
            return [String(v), 'is out of range of', name]
        }
    }

    Object.defineProperty(fn, 'name', { value: name })

    return fn
}

function uint (bits: number) {
    const min = Big(0)
    const max = Big(2).pow(bits).minus(1)
    const name = `uint` + bits

    const fn = function (ctx: Context): any {
        if (ctx.root.isMock)
            return _.random(0, 255)

        let v = ctx.data

        if (!_.isInteger(v))
            return [v, 'is not an integer']

        v = Big(v)
        if (max.lt(v) || min.gt(v))
            return [String(v), 'is out of range of', name]
    }

    Object.defineProperty(fn, 'name', { value: name })

    return fn
}

function float (ctx: Context): any {
    if (ctx.root.isMock)
        return _.random(-1000.1, 1000.1)

    const v = ctx.data

    if (!_.isNumber(v) || v < utils.MIN_SAFE_INTEGER || v > utils.MAX_SAFE_INTEGER)
        return [v, `is not float`]
}

function double (ctx: Context): any {
    if (ctx.root.isMock)
        return _.random(-1000.1, 1000.1)

    const v = ctx.data

    if (!_.isNumber(v) || v < utils.MIN_SAFE_INTEGER || v >  utils.MAX_SAFE_INTEGER)
        return [v, `is not double`]
}

function str (ctx: Context): any {
    if (ctx.root.isMock)
        return _.randStr()

    if (!_.isString(ctx.data))
        return [ctx.data, `is not string`]
}

function tuple (type): Type {
    return function (ctx: Context) {
        if (ctx.root.isMock) {
            const mocks = []
            for (const item of type) {
                mocks.push(ctx.mock(item))
            }
            return mocks
        }

        if (!(ctx.data instanceof Array)) {
            return [ctx.data, `is not tuple`, type]
        }

        for (let i = 0; i < type.length; ++ i) {
            if (type[i]['___rest']) {
                ctx.validate(ctx.data.slice(i), type[i])
                break
            }
            ctx.validate(ctx.data[i], type[i])
        }
    }
}

function rest (type): Type {
    const fn = function (ctx: Context) {
        if (ctx.root.isMock) {
            const mocks = []
            for (const item of type) {
                mocks.push(ctx.mock(item))
            }
            return mocks
        }

        if (!(ctx.data instanceof Array)) {
            return [ctx.data, `is not rest`, type]
        }

        for (let i = 0; i < ctx.data.length; ++ i) {
            ctx.validate(ctx.data[i], type)
        }
    }
    fn['___rest'] = true
    return fn
}

function eq (val): Type {
    return function (ctx: Context) {
        if (ctx.root.isMock)
            return val

        if (!_.isEqual(ctx.data, val))
            return [ctx.data, 'is not deep equal', val]
    }
}

function Enum (...values): Type {
    return function (ctx) {
        if (ctx.root.isMock)
            return values[_.random(0, values.length - 1)]

        for (let i = 0; i < values.length; i++) {
            if (_.isEqual(values[i], ctx.data)) {
                return
            }
        }

        return [ctx.data, `is not one of enum`, values]
    }
}

function optional (type): Type {
    return function (ctx: Context) {
        if (ctx.root.isMock)
            return ctx.mock(type)


        if (!_.isUndefined(ctx.data))
            ctx.validate(ctx.data, type)
    }
}

function mock (...args): Type {
    const type = args.pop()
    const mocks = args

    if (mocks.length === 0)
        throw new TypeError('at least one mock should be specified')

    return function (ctx: Context) {
        if (ctx.root.isMock)
            return mocks[_.random(0, mocks.length - 1)]

        ctx.validate(ctx.data, type)
    }
}

function mockKey (...args): Type {
    const type = args.pop()
    const mocks = args

    if (mocks.length === 0)
        throw new TypeError('at least one mock should be specified')

    const fn: Type = (ctx: Context) => {
        if (ctx.root.isMock)
            return ctx.mock(type)

        ctx.validate(ctx.data, type)
    }

    fn.keyMock = mocks[_.random(0, mocks.length - 1)]

    return fn
}

function allOf (...types): Type {
    return function (ctx: Context) {
        if (ctx.root.isMock)
            throw new TypeError('"allOf" must be used with "mock" type')

        for (let i = 0; i < types.length; i++) {
            ctx.validate(ctx.data, types[i])
        }
    }
}

function oneOf (...types): Type {
    return (ctx: Context) => {
        if (ctx.root.isMock)
            throw new TypeError('"oneOf" must be used with "mock" type')

        const errors = ctx.root.errors
        let count = 0
        let ret = []
        for (let i = 0; i < types.length; i++) {
            ctx.root.errors = []
            ctx.validate(ctx.data, types[i])
            if (ctx.root.errors.length === 0)
                count++

            ret = ret.concat(ctx.root.errors)
        }

        if (count !== 1) {
            ctx.root.errors.push(new LierError(
                ctx.path,
                [ctx.data, 'should match one and only one of', types, 'but matches', count],
            ))
        } else {
            ctx.root.errors = errors
        }
    }
}

function anyOf (...types): Type {
    return function (ctx: Context) {
        if (ctx.root.isMock)
            return ctx.mock(types[_.random(0, types.length - 1)])

        const errors = ctx.root.errors
        let rets = []
        for (let i = 0; i < types.length; i++) {
            ctx.root.errors = []
            ctx.validate(ctx.data, types[i])
            if (ctx.root.errors.length === 0) {
                ctx.root.errors = errors
                return
            } else {
                rets = rets.concat(ctx.root.errors)
            }
        }
        ctx.root.errors = errors.concat(rets)
    }
}

function any (ctx: Context) {
    if (ctx.root.isMock) {
        const val = [1, 'string', null, [1, 2, 3]]
        return val[_.random(0, val.length - 1)]
    }
}

function not (type) {
    return function (ctx: Context) {
        if (ctx.root.isMock)
            throw new TypeError('"not" must be used with "mock" type')

        const errors = ctx.root.errors
        ctx.root.errors = []
        ctx.validate(ctx.data, type)

        if (ctx.root.errors.length > 0)
            ctx.root.errors = errors
        else
            ctx.root.errors = errors.concat(
                [ctx.data, 'should not match type', type],
            )
    }

}

function nil (ctx: Context) {
    if (ctx.root.isMock) return

    if (!_.isUndefined(ctx.data))
        return [ctx.data, 'should be undefined']
}

function never (ctx: Context) {
    if (ctx.root.isMock) return

    ctx.root.errors.push(new LierError(ctx.path, ['property should be void']))
}

function ref (path?: string | string[]): Type {
    return function fn (ctx) {
        if (ctx.root.isMock) {
            return path && String(path).length ?
                ctx.mock(getError(ctx.root.type, path)) :
                ctx.mock(ctx.root.type)
        }

        const type = path && String(path).length ?
            getError(ctx.root.type, path) :
            ctx.root.type

        if (type === fn)
            throw new TypeError('ref should not ref itself')

        ctx.validate(ctx.data, type)
    }
}

function self (fn:  (self: any) => any): Type {
    return (ctx) => {
        if (ctx.root.isMock)
            return fn(ctx.root.data)

        const data = fn(ctx.root.data)
        if (!_.isEqual(ctx.data, data))
            return [ctx.data, 'should equal', data, 'which generated by expression', fn.toString()]
    }
}

function definition (paths: string[] | string): Type {
    return function fn (ctx: Context) {
        if (!_.isObjectLike(_.get(ctx, 'root.declares'))) {
            throw 'not implemented type:' + paths
        }
        const type = _.get(ctx.root.declares, paths)
        if (ctx.root.isMock) {
            return ctx.mock(type)
        }


        if (!type) {
            ctx.root.errors.push(new LierError(ctx.path, ['not implemented type:' + paths]))
            return
        }
        ctx.validate(ctx.data, type)
    }
}

function match (fn: (self: any) => any, cases: Array<{ cond: any, type: any }>): Type {
    return (ctx: Context) => {
        if (ctx.root.isMock)
            throw new TypeError('"match" must be used with "mock" type')

        const val = fn(ctx.root.data)
        for (const c of cases) {
            const errors = ctx.root.errors
            ctx.root.errors = []
            ctx.validate(val, c.cond)
            if (!ctx.root.errors.length) {
                ctx.root.errors = errors
                ctx.validate(ctx.data, c.type)
                return
            }
            ctx.root.errors = errors
        }

        return [ctx.data, `doesn't match any case of`, cases]
    }
}

function description (desc: string, type): Type {
    const fn: Type = (ctx: Context) => {
        if (ctx.root.isMock)
            return ctx.mock(type)

        ctx.validate(ctx.data, type)
    }

    fn.description = desc

    return fn
}

function range (...args): Type {
    const type = args.pop()
    let max = utils.MAX_SAFE_INTEGER
    let min = utils.MIN_SAFE_INTEGER
    if (args.length === 2) {
        max = args[1]
        min = args[0]
    } else if (args.length === 1) {
        min = args[0] > 0 ? 0 : args[0]
        max = args[0] > 0 ? args[0] : 0
    } else {
        throw TypeError('arguments of range should not be empty')
    }
    const fn: Type = (ctx: Context) => {
        if (ctx.root.isMock)
            throw new TypeError('"range" must be used with "mock" type')

        const v = ctx.data
        if (_.isNumber(v)) {
            if (v > max || v < min) {
                return [v, `is not in range(${min}, ${max})`]
            }
        } else if (_.isString(v) || _.isArray(v)) {
            if (v.length > max || v.length < min) {
                return [v, `is not in range(${min}, ${max})`]
            }
        } else {
            return [v, `is not in number, array, string`]
        }
        ctx.validate(v, type)
    }
    return fn
}

function getError (data: any, path: string | string[]) {
    const ret = _.get(data, path, getError)
    if (ret === getError) {
        throw new TypeError('this path is not found')
    }
    return ret
}

export default {
    // data form
    bool,

    int8: int(8),
    byte: int(8),
    int16: int(16),
    short: int(16),
    int32: int(32),
    int: int(32),
    int64: int(64),
    int128: int(128),
    i128: int(128),
    long: int(64),

    uint8: uint(8),
    uint16: uint(16),
    char: uint(16),
    uint32: uint(32),
    uint: uint(32),
    uint64: uint(64),
    uint128: uint(128),

    float,
    double,
    number: double,

    str,

    tuple,

    // logic
    Infinity,
    eq,
    enum: Enum,
    merge: _.merge,
    optional,
    mock,
    mockKey,
    allOf,
    oneOf,
    anyOf,
    any,
    not,
    nil,
    undefined,
    never,
    ref,
    self,
    match,
    description,
    range,
    _: description,
    definition,
    rest,
}
