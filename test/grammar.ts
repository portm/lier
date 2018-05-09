import * as Big from 'big.js'
import { types, validate, validatex } from '../src/index'
import utils from '../src/utils'

export = (it) => {
    function test (title, data, type, expect?) {
        return it(`${title}: ${JSON.stringify(data)}`, () => {
            let out
            try {
                out = validatex(data, type)
            } catch (exp) {
                return it.eq(exp.message, expect)
            }

            return it.eq(
                out ? JSON.parse(JSON.stringify(out)) : out,
                expect,
            )
        })
    }

    test('base type string',
    'string'
    , `
    str
    `)

    test('base type string error',
    1,
    `
    str
    `,
    [ { path: [], message: [ 1, 'is not string' ] } ])

    test('base type object', {
        a: 'string',
    }, `
    {
        a: str
    }
    `)

    test('base type boolean', {
        true: true,
        false: false,
    }, `
    {
        true: bool
        false: bool
    }
    `)

    test('base type boolean error',
    'true',
    `
    bool
    `,
    [ { path: [], message: [ 'true', 'is not boolean' ] } ])

    test('base type int8 min',
    -Math.pow(2, 7)
    , `
    int8
    `)

    test('base type int8 min error'
    , -Math.pow(2, 7) - 1,
    `
    int8
    `,
    [ { path: [], message: [ '-129', 'is out of range of', 'int8' ] } ])

    test('base type int8 max',
    Math.pow(2, 7) - 1,
    `
    int8
    `)

    test('base type int8 max error',
    Math.pow(2, 7),
    `
    int8
    `,
    [ { path: [], message: [ '128', 'is out of range of', 'int8' ] } ])

    test('base type int16 min',
    -Math.pow(2, 15),
    `
    int16
    `)

    test('base type int16 min error',
    -Math.pow(2, 15) - 1,
    `
    int16
    `,
    [ { path: [],
      message: [ '-32769', 'is out of range of', 'int16' ] } ])

    test('base type int16 max',
    Math.pow(2, 15) - 1,
    `
    int16
    `)

    test('base type int16 max error',
    Math.pow(2, 15),
    `
    int16
    `,
    [ { path: [],
      message: [ '32768', 'is out of range of', 'int16' ] } ])

    test('base type int32 min',
    -Math.pow(2, 31),
    `
    int32
    `)

    test('base type int32 min error',
    -Math.pow(2, 31) - 1,
    `
    int32
    `,
    [ { path: [],
      message: [ '-2147483649', 'is out of range of', 'int32' ] } ])

    test('base type int32 max',
    Math.pow(2, 31) - 1,
    `
    int32
    `)

    test('base type int32 max error',
    Math.pow(2, 31),
    `
    int32
    `,
    [ { path: [],
      message: [ '2147483648', 'is out of range of', 'int32' ] } ])

    test('base type int64 min',
    Big(2).pow(63).times(-1).toString(),
    `
    int64
    `)

    test('base type int64 min error',
    Big(2).pow(63).times(-1).minus(1).toString(),
    `
    int64
    `,
    [ { path: [],
      message: [ '-9223372036854775809', 'is out of range of', 'int64' ] } ])

    test('base type int64 max',
    Big(2).pow(63).minus(1),
    `
    int64
    `)

    test('base type int64 max error',
    Big(2).pow(63),
    `
    int64
    `,
    [ { path: [],
      message: [ '9223372036854775808', 'is out of range of', 'int64' ] } ])

    test('base type uint8 min',
    0,
    `
    uint8
    `)

    test('base type uint8 min error',
    -1,
    `
    uint8
    `,
    [ { path: [], message: [ '-1', 'is out of range of', 'uint8' ] } ])

    test('base type uint8 max',
    Math.pow(2, 8) - 1,
    `
    uint8
    `)

    test('base type uint8 max error',
    Math.pow(2, 8),
    `
    uint8
    `,
    [ { path: [], message: [ '256', 'is out of range of', 'uint8' ] } ])

    test('base type uint16 min',
    0,
    `
    uint16
    `)

    test('base type uint16 min error',
    -1,
    `
    uint16
    `,
    [ { path: [], message: [ '-1', 'is out of range of', 'uint16' ] } ])

    test('base type uint16 max',
    Math.pow(2, 16) - 1,
    `
    uint16
    `)

    test('base type uint16 max',
    Math.pow(2, 16),
    `
    uint16
    `,
    [ { path: [],
      message: [ '65536', 'is out of range of', 'uint16' ] } ])

    test('base type uint32 min',
    0,
    `
    uint32
    `)

    test('base type uint32 min error',
    -1,
    `
    uint32
    `,
    [ { path: [], message: [ '-1', 'is out of range of', 'uint32' ] } ])

    test('base type uint32 max',
    Math.pow(2, 32) - 1,
    `
    uint32
    `)

    test('base type uint32 max error',
    Math.pow(2, 32),
    `
    uint32
    `,
    [ { path: [],
      message: [ '4294967296', 'is out of range of', 'uint32' ] } ])

    test('base type uint64 min',
    0,
    `
    uint64
    `)

    test('base type uint64 min error',
    -1,
    `
    uint64
    `,
    [ { path: [], message: [ '-1', 'is out of range of', 'uint64' ] } ])

    test('base type uint64 max',
    Big(2).pow(64).minus(1),
    `
    uint64
    `)

    test('base type uint64 max error',
    Big(2).pow(64),
    `
    uint64
    `, [ { path: [],
      message: [ '18446744073709551616', 'is out of range of', 'uint64' ] } ])

    // test('base type float min',
    // Number.MIN_SAFE_INTEGER,
    // `
    // float
    // `);

    // //TODO:
    // test('base type float min error',
    // Number.MIN_SAFE_INTEGER - 1,
    // `
    // float
    // `,
    // [ { path: [],
    //   message: [ -9007199254740992, 'is not float' ] } ]);

    // //TODO:
    // test('base type float max',
    // Number.MAX_SAFE_INTEGER,
    // `
    // float
    // `);

    // //TODO:
    // test('base type float max error',
    // Number.MAX_SAFE_INTEGER + 1,
    // `
    // float
    // `,
    // [ { path: [], message: [ 9007199254740992, 'is not float' ] } ]);

    // //TODO:
    // test('base type double min',
    // Number.MIN_SAFE_INTEGER,
    // `
    // double
    // `);

    // //TODO:
    // test('base type float double error',
    // Number.MIN_SAFE_INTEGER - 1,
    // `
    // double
    // `,
    // [ { path: [],
    //   message: [ -9007199254740992, 'is not double' ] } ]);

    // //TODO:
    // test('base type double max',
    // Number.MAX_SAFE_INTEGER,
    // `
    // double
    // `);

    // //TODO:
    // test('base type double max error',
    // Number.MAX_SAFE_INTEGER + 1,
    // `
    // double
    // `,
    // [ { path: [], message: [ 9007199254740992, 'is not double' ] } ]);

    test('base type number min',
    utils.MIN_SAFE_INTEGER,
    `
    number
    `)

    // //TODO:
    // test('base type float number error',
    // Number.MIN_SAFE_INTEGER - 1,
    // `
    // number
    // `,
    // [ { path: [],
    //   message: [ -9007199254740992, 'is not double' ] } ]);

    test('base type number max',
    utils.MAX_SAFE_INTEGER,
    `
    number
    `)

    // //TODO:
    // test('base type number max error',
    // Number.MAX_SAFE_INTEGER + 1,
    // `
    // number
    // `,
    // [ { path: [], message: [ 9007199254740992, 'is not double' ] } ]);

    test('alias base type', {
        i8: 127,
        i16: 255,
        i32: 65536,
        i64: 65536,
    }, `
    {
        i8: int8
        i16: int16
        i32: int32
        i64: int64
    }
    `)

    test('common alias base type', {
        byte: -128,
        short: -255,
        int: -65536,
        long: -65536,
        char: 128,
        uint: 65536,
        bool: true,
        str: '',
    }, `
    {
        byte: byte
        short: short
        int: int
        long: long
        char: char
        uint: uint
        bool: bool
        str: str
    }
    `)

    test('regular type', {
        regex: 'Number:23333',
    }, `
    {
        regex: /^number:\\d+$/i
    }
    `)

    test('regular type error', {
        regex: 'Number:23333',
    }, `
    {
        regex: /^number:\\d+$/
    }
    `,
    [ { path: [ 'regex' ],
      message: [ 'Number:23333', 'doesn\'t match regex', {} ] } ])

    test('value type', {
        b: true,
        c: null,
        d: 's',
        oct: 54,
        dec: 66,
        hex: 0xff,
    }, `
    {
        b: true
        c: null
        d: 's'
        oct: 54
        dec: 66
        hex: 0xff
    }
    `)

    test('expression value type', {
        a: 1 | 2,
        b: 2 & 1,
        c: 3 + 1 * 5 / (2 + 6) - 1,
        d: !(1 * 2 - 5),
    }, `
    {
        # 1 | 2 <=> anyOf(1, 2)
        a: 3
        # 2 & 1 <=> allOf(1, 2)
        b: 0
        c: 3 + 1 * 5 / (2 + 6) - 1
        d: !(1 * 2 - 5)
    }
    `)

    test('optional hit', {
        a: 1,
    }, `
    {
        a?: int
    }
    `)

    test('optional hit error', {
        a: '1',
    }, `
    {
        a?: int
    }
    `,
    [ { path: [ 'a' ], message: [ '1', 'is not an integer' ] } ])

    test('optional miss', {
    }, `
    {
        a?: int
    }
    `)

    test('nested object type', {
        a: {
            a: 1,
        },
    }, `
    {
        a: {
            a: int
        }
    }
    `)

    test('allOf type', {
        a: 1,
        b: true,
    }, `
    ({ a: int } & { b: bool })
    `)

    test('allOf type error', {
        a: false,
        b: true,
    }, `
    ({ a: int } & { b: bool })
    `,
    [ { path: [ 'a' ], message: [ false, 'is not an integer' ] } ])

    test('anyOf type A', {
        a: 1,
    }, `
    ({ a: int } | { b: bool })
    `)

    test('anyOf type B', {
        b: true,
    }, `
    ({ a: int } | { b: bool })
    `)

    test('anyOf type C', {
        a: 1,
        b: true,
    }, `
    ({ a: int } | { b: bool })
    `)

    test('anyOf type error', {
        b: 1,
    }, `
    ({ a: int } | { b: bool })
    `,
    [ { path: [ 'a' ], message: [ null, 'is not an integer' ] },
    { path: [ 'b' ], message: [ 1, 'is not boolean' ] } ])

    test('oneOf type A', {
        a: 1,
    }, `
    oneOf({ a: int }, { b: bool })
    `)

    test('oneOf type B', {
        b: false,
    }, `
    oneOf({ a: int }, { b: bool })
    `)

    test('oneOf type error', {
        a: 1,
        b: false,
    }, `
    oneOf({ a: int }, { b: bool })
    `,
    [ { path: [],
      message:
       [ { a: 1, b: false },
         'should match one and only one of',
         [ {}, {} ],
         'but matches',
         2 ] } ])

    test('enum type A',
    1,
    `
    enum {
        1,
        2,
        { a : 1 }
    }
    `)

    test('enum type B',
    { a : 1 },
    `
    enum {
        1,
        2,
        { a : 1 }
    }
    `)

    test('enum type error',
    { a : 2 },
    `
    enum {
        1,
        2,
        { a : 1 }
    }
    `,
    [ { path: [],
      message: [ { a: 2 }, 'is not one of enum', [ 1, 2, { a: 1 } ] ] } ])

    test('not type',
    { a : 2 },
    `
    !{ a : 1 }
    `)

    test('not type error',
    { a : 1 },
    `
    !{ a : 1 }
    `,
    [ { a: 1 }, 'should not match type', { a: 1 } ])

    test('any type A',
    { a : 2 },
    `
    any
    `)

    test('any type B',
    undefined,
    `
    any
    `)

    test('never type',
    1,
    `
    never
    `,
    [ { path: [], message: [ 'property should be void' ] } ])

    test('tuple',
        [{ a: 10 }, { b: 10 }],
        `[{ a: int }, { b: uint }]`,
    )
    test('tuple err',
        [{ a: 10 }, { b: -10 }],
        `[{ a: int }, { b: uint }]`,
        [ { path: [ 'b' ], message: [ '-10', 'is out of range of', 'uint32' ] } ]
    )
    test('tuple err 1',
        1,
        `[{ a: int }, { b: uint }]`,
        [ { path: [], message: [ 1, 'is not tuple', [ {}, {} ] ] } ]
    )

    test('self type',
    {
        a: 1,
        b: {
            c: 2,
            d: 1,
        },
    },
    `
    {
        a: int
        b: {
            c: self.a + self.b.d
            d: int
        }
    }
    `)

    test('self type error',
    {
        a: 1,
        b: {
            c: 3,
            d: 1,
        },
    },
    `
    {
        a: int
        b: {
            c: self.a + self.b.d
            d: int
        }
    }
    `,
    [ { path: [ 'b', 'c' ],
      message:
       [ 3,
         'should equal',
         2,
         'which generated by expression',
         'function (self) { return left(self) + right(self); }' ] } ])

    test('this type A',
    {
        a: { a : 1 },
        b: {
            c: { a : 1 },
            d: { b : true },
            e: 1,
        },
    },
    `
    type a {
        a : int
    }
    type d {
        b : true
    }
    {
        a: a
        b: {
            c: a | d
            d: d
            e: a.a
        }
    }
    `)

    test('this type B',
    {
        a: { a : 1 },
        b: {
            c: { b : true },
            d: { b : true },
            e: 1,
        },
    },
    `
    type a {
        a : int
    }
    type d {
        b : true
    }
    {
        a: a
        b: {
            c: a | d
            d: d
            e: a.a
        }
    }
    `)

    test('this type error',
    {
        a: { a : 1 },
        b: {
            c: { b : false },
            d: { b : true },
            e: 1,
        },
    },
    `
    type a {
        a : int
    }
    type d {
        b : true
    }
    {
        a: a
        b: {
            c: a | d
            d: d
            e: a.a
        }
    }
    `,
    [ { path: [ 'b', 'c', 'a' ],
      message: [ null, 'is not an integer' ] },
    { path: [ 'b', 'c', 'b' ], message: [ false, 'is not', true ] } ])

    test('match type A',
    {
        a: 2,
        b: 1,
    },
    `
    {
        a: int
        b: match self.a % 2 {
            case 0 => int
            case any => never
        }
    }
    `)

    test('match type B',
    {
        a: 3,
        b: '1',
    },
    `
    {
        a: int
        b: match self.a % 2 {
            case 1 => str
            case any => never
        }
    }
    `)

    test('match type error',
    {
        a: 2,
        b: 1,
    },
    `
    {
        a: int
        b: match self.a % 2 {
            case 1 => int
            case any => never
        }
    }
    `,
    [ { path: [ 'b' ], message: [ 'property should be void' ] } ])

    test('regular key',
    {
        a: 1,
    },
    `
    {
        /^[a-z]+$/: 1
    }
    `)

    test('regular key error',
    {
        a: 1,
    },
    `
    {
        /^[a-z]+$/: never
    }
    `,
    [ { path: [ 'a' ], message: [ 'property should be void' ] } ])

    test('range decorate',
    {
        a: 1,
    },
    `
    {
        @range(1, 10)
        a: int
    }
    `)

    test('range decorate error',
    {
        a: 11,
    },
    `
    {
        @range(1, 10)
        a: int
    }
    `,
    [ { path: [ 'a' ], message: [ 11, 'is not in range(1, 10)' ] } ])

    test('description decorate',
    {
        a: 1,
    },
    `
    {
        @_(1)
        a: int
    }
    `)

    test('description decorate error',
    {
        a: 1,
    },
    `
    {
        @_()
        a: int
    }
    `,
    'type must not be void')

    test('all type',
    {
        regex: 2,
        oct: 54,
        dec: 66,
        hex: 0xff,
        int: 1,
        str: '1',
        bool: true,
        byte: 1,
        short: 1,
        uint: 1,
        float: 1.1,
        enum: 2,
        allOf: 1,
        anyOf: '1',
        any: {},
        a: 1,
        // never: 1,
        sub: [{
            a: 2,
            b: 5,
            this: [{
                a: 2,
                b: 5,
                this: 1,
            }],
        }],
        match: 4,
    }, `
    type Int int
    type Str str
    type Sub {
        a : Int | Str
        b : self.regex * self.regex + 1
        this : Sub[] | int
    }
    {
        @mock(1)
        regex : /^\\d$/
        /regex/ : int
        @description('a')
        @description("b")
        oct : 066
        dec : 66
        hex : 0xff
        int : int
        str : str
        bool : bool
        optional? : bool
        byte : byte
        short : short
        uint : uint
        float : float
        @mock(2)
        @mock(1)
        enum : enum {
            1, 2
        }
        @mock(3)
        allOf : int & uint
        anyOf : int | str
        any : any
        never? : never
        $rest : any
        sub : Sub[]
        match : match self.regex {
            case 2 => 2 * 2
            case any => 3 * 2
        }
    }
    `)
}
