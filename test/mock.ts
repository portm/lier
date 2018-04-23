import * as lier from '../src/index'

const {
    int, str, anyOf, allOf, merge,
    eq, uint, ref, mock, mockKey,
    description,
} = lier.types

export = (it) => {
    function test (description: string, type, expect?) {
        it('mock: ' + description, () => {
            return it.eq(
                lier.validate(lier.mock(type), type),
                expect,
            )
        })
    }

    test('basic 1', {
        a: 1,
        b: null,
        c: int,
        d: str,
        e: anyOf({
            a: str,
            b: uint,
        }),
    })

    test('basic 2', {
        a: 1,
        b: null,
        c: uint,
        d: description('test', str),
        e: anyOf({
            a: str,
            b: uint,
        }),
        f: ref('d'),
        g: /\d+/,
        h: eq(/\d+/),
        [<any> /sss/]: int,
        $rest: mockKey('1', '2', '3', int),
        $definitions: {
            a: str,
        },
    })

    test('basic 3', {
        a: 1,
        b: null,
        c: int,
        d: str,
        e: anyOf({
            a: str,
            b: uint,
        }),
        f: mock({ a: 1, b: '2' }, allOf({
            a: int,
        }, {
            b: str,
        })),
        g : mock(1, 2, 3, /^\d$/),
    })

    test('cycle', (() => {
        const obj = { a: { b: { c: null }, d: int, e: str } }
        obj.a.b.c = obj
        return obj
    })())

    it('allOf mock type err', () => {
        try {
            lier.mock(mock(1, allOf({ b: str }, { c: int })))
        } catch (err) {
            return it.eq(err instanceof TypeError, true)
        }

        throw new Error()
    })

    it('allOf mock err', () => {
        try {
            lier.mock(allOf({ b: str }, { c: int }))
        } catch (err) {
            return it.eq(err.message.indexOf('"allOf" must be used with "mock" type') === 0, true)
        }

        throw new Error()
    })
}
