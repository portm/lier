import br from '../src/brush'
import * as lier from '../src/index'
import { LierError } from '../src/interfaces'
import inspect from '../src/inspect'
import * as _ from 'lodash'

declare let Promise

const {
    int, uint, str, anyOf, oneOf, not, merge,
    allOf, never, tuple, ref, self, mock,
    description, eq, match, range, nil,
} = lier.types

export = (it) => {
    function test (description: string, value, type, expect?) {
        it('validate: ' + description, () => {
            let val = lier.validate(value, type)

            if (_.isArray(val) && val[0] instanceof LierError) {
                val = val.map(err => {
                    return {
                        path: err.path,
                        message: err.message,
                    }
                }) as any
            }

            return it.eq(
                val,
                expect,
            ).catch((err) => {
                return Promise.reject(err)
            })
        })
    }

    test('number', 10, 10)
    test('number2', NaN, NaN)
    test('number err', 10, 11, [{ path: [], message: [10, 'is not', 11] }])

    test('string', '10', '10')
    test('string err', '10', '11', [{ path: [], message: ['10', 'is not', '11'] }])

    test('nil', undefined, nil)
    test('nil err', '10', nil, [{ path: [], message: ['10', 'should be undefined'] }])

    test('array', ['10', '12'], [str])
    test('array err', ['10', 12], [str], [{ path: ['1'], message: [12, 'is not string'] }])

    test('bool', true, true)
    test('bool err', true, false, [{ path: [], message: [true, 'is not', false] }])

    test('date', new Date(1), new Date(1))
    test('date err', new Date(1), new Date(2), [{ path: [], message: [ new Date(1), 'is not', new Date(2) ] }])

    test('regex', /test/, /test/)
    test('regex err', /test/, /test/i, [ { path: [], message: [ /test/, 'is not', /test/i ] } ])

    test('regex str', '100', /\d{3,}/)
    test('regex str err', '10', /\d{3,}/, [ { path: [], message: [ '10', 'doesn\'t match regex', /\d{3,}/ ] } ])

    test('enum', { a: 1 }, lier.types.enum({ a: 0 }, { a: 1 }))
    test('enum err', { a: 3 }, lier.types.enum({ a: 0 }, { a: 1 }),
        [{
            path: [],
            message: [{ a: 3 }, 'is not one of enum', [{ a: 0 }, { a: 1 }]],
        }],
    )

    test('object', { a: { b: 1 } }, { a: { b: uint } })
    test('object err', { a: { b: '1' } }, { a: { b: uint } },
        [{ path: ['a', 'b'], message: ['1', 'is not an integer'] }],
    )

    test('never', { a: { b: undefined } }, { a: { b: never } },
        [{ path: ['a', 'b'], message: ['property should be void'] }],
    )

    test('tuple',
        [{ a: 10 }, { b: 10 }],
        tuple([{ a: int }, { b: uint }]),
    )
    test('tuple err',
        [{ a: 10 }, { b: -10 }],
        tuple([{ a: int }, { b: uint }]),
        [ { path: [ 'b' ],
      message: [ '-10', 'is out of range of', 'uint32' ] } ]
    )
    test('tuple err 1',
        1,
        [{ a: int }, { b: uint }],
        [ { path: [],
            message: 
             [ 1,
               'is not',
               [ { a: int }, { b: uint } ] ] } ]
      
    )

    it('description', () => {
        const fn = description('ok', int)

        return it.eq(fn.description, 'ok')
    })

    test('allOf', { a: { b: '1', c: 1 } }, { a: allOf({ b: str }, { c: int }) })
    test('allOf err',
        { a: { b: '1', c: '1' } },
        { a: allOf({ b: str }, { c: int }) },
        [{ path: ['a', 'c'], message: ['1', 'is not an integer'] }],
    )

    test('anyOf', { a: { b: 1 } }, { a: anyOf({ b: str }, { b: int }) })
    test('anyOf err',
        { a: { b: [1] } },
        { a: anyOf({ b: str }, { b: int }) },
        [
            { path: ['a', 'b'], message: [[1], 'is not string'] },
            { path: ['a', 'b'], message: [[1], 'is not an integer'] },
        ],
    )

    test('oneOf', { a: 1, b: '1' }, oneOf({ a: int }, { b: int }))
    test('oneOf', { a: 1, b: 1 }, oneOf({ a: int }, { b: int }), [
        { path: [],
      message:
       [ { a: 1, b: 1 },
         'should match one and only one of',
         [ { a: int }, { b: int } ],
         'but matches',
         2 ] } ],
    )
    test('oneOf 0', [
        {
            "a": 1
        },
        {
            "b": 1
        },
        {
            "c": 1
        }
    ], [oneOf({
        a: int
    }, {
        b: int
    }, {
        c: int
    })])

    test('not', { a: 1 }, { a: not(str) })
    test('not err', { a: '1' }, { a: not(str) }, [ '1', 'should not match type', str ])

    test('merge', { a: { b: '1', c: 1 } }, merge({ a: { b: str } }, { a: { c: int } }))
    test('merge err',
        { a: { b: '1', c: '1' } },
        merge({ a: { b: str } }, { a: { c: int } }),
        [{ path: ['a', 'c'], message: ['1', 'is not an integer'] }],
    )

    test('key pattern',
        { a: 1, b: 2, 1: 'a', 2: 'b' },
        { [<any> /\D+/]: int, [<any> /\d+/]: str },
    )
    test('key pattern err',
        { a: 1, b: 2, 1: 1, 2: 'b' },
        { [<any> /\D+/]: int, [<any> /\d+/]: str },
        [{ path: ['1'], message: [1, 'is not string'] }],
    )

    test('$rest',
        { a: 1, b: '1', $rest: '2' },
        { a: int, $rest: str },
    )
    test('$rest with reg key',
        { 1: 1, b: '1', $rest: '2' },
        { [/\d+/ as any]: int, $rest: str },
    )
    test('$rest err',
        { a: 1, b: '1', c: 2 },
        { a: int, $rest: str },
        [{ path: ['c'], message: [2, 'is not string'] }],
    )
    test('ban extra properties',
        { a: 1, b: '1', c: undefined },
        { a: int, $rest: never },
        [
            { path: ['b'], message: ['property should be void'] },
            { path: ['c'], message: ['property should be void'] },
        ],
    )

    test('ref', { a: 1, b: 2 }, { a: int, b: ref('a') })
    test('ref recursive',
        { a: 1, b: { a: 1, b: { a: 1, b: null } } },
        {
            a: int,
            b: anyOf(ref(), null),
        },
    )
    test('ref cycle 01', (() => {
        const a = {
            b: {
                b: {
                    b: null,
                },
            },
        }
        a.b.b.b = a
        return a
    })(), { b: ref() })
    test('ref cycle 02', (() => {
        const a = {
            b: null,
        }
        a.b = a
        return a
    })(), { b: { b: { b: ref() } } })
    it('ref cycle 03', () => {
        try {
            lier.validate({}, {a: ref('a')})
            throw Error()
        } catch (err) {
            return it.eq(err.message, 'ref should not ref itself')
        }
    })

    test('self', { a: 2, b: 16 }, { a: int, b: self(s => Math.pow(s.a, 4)) })
    test('self err', { a: 2, b: 16 }, { a: int, b: self(s => s.a * 2) }, [{
        path: ['b'],
        message:
        [
            16,
            'should equal',
            4,
            'which generated by expression',
            'function (s) { return s.a * 2; }',
        ],
    }])

    test('match', {
        a: 1,
        b: 'ok',
    }, {
        b: match((s) => s.a, [{
            cond: str,
            type: int,
        }, {
            cond: int,
            type: str,
        }]),
    })

    test('match err', {
        a: 1,
        b: 'ok',
    }, {
        b: match((s) => s.a, [{
            cond: str,
            type: int,
        }, {
            cond: int,
            type: 'sss',
        }]),
    }, [ { path: [ 'b' ], message: [ 'ok', 'is not', 'sss' ] } ])


    test('@range1',
        { a: 10 },
        { a: range(10, int) },
    )
    test('@range2',
        { a: 10 },
        { a: range(10, 20, int) },
    )

    test('@range err',
        { a: 101 },
        { a: range(10, 20, int) },
        [
            { path: ['a'], message: [101, 'is not in range(10, 20)'] },
        ],
    )

    it('undefined type', () => {
        try {
            lier.validate({a: 1}, {a: undefined})
            throw Error()
        } catch (err) {
            return it.eq(err.message, 'type must not be void')
        }
    })

    it('inspect', () => {
        const ret = lier.validate(
            {a: {b: 1}, c: 1},
            {a: str, c: lier.types.enum(2, 3, 4)},
        )

        return it.eq(br.strip(inspect(ret)), `
            [
                TypeError {
                    path: 'a',
                    message: {
                        b: 1
                    } is not string
                },
                TypeError {
                    path: 'c',
                    message: 1 is not one of enum [
                        2,
                        3,
                        4
                    ]
                }
            ]
        `.replace(/^            /mg, '').trim())
    })
}
