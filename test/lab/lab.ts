import * as lier from '../../src'
import jsonschema2ast from '../../src/grammar/transform/jsonschema-ast'
import ast2jsonschema from '../../src/grammar/transform/ast-jsonschema'

const base = lier.parse(`{
    a: ({
        @_('d1')
        a: any
        @_('d2')
        c: any
    })[]
}[]`)





console.time('parse')
// console.log(lier.stringify(lier.deduction([
//     {
//         a: [
//             // {
//             //     b: '123',
//             // },
//             // {
//             //     a: 1,
//             //     b: '213',
//             // },
//             {
//                 a: 1,
//             },
//             {
//                 a: 1,
//             }
//         ]
//     },
//     {
//         a: [
//             // {
//             //     b: '123',
//             // },
//             // {
//             //     a: 1,
//             //     b: '213',
//             // },
//             {
//                 a: 1,
//             },
//             // {
//             //     b: '123',
//             // }
//         ]
//     }
// ], base)))
// console.log(lier.stringify(lier.deduction([
//     {
//         a: 1,
//         b: '2'
//     },
//     {
//         a: 1
//     },
//     {
//         a: 2
//     },
// ])))
// console.log(lier.stringify(lier.deduction([
//     {
//         a: 1,
//         c: 'any'
//     }
// ], base)))

console.log(lier.validatex({
    "regex": 2,
    "oct": 54,
    "dec": 66,
    "hex": 255,
    "int": 1,
    "str": "1",
    "bool": true,
    "byte": 1,
    "short": 1,
    "uint": 1,
    "float": 1.1,
    "enum": 2,
    "allOf": 1,
    "anyOf": "1",
    "any": {},
    "a": 1,
    "sub": [
        {
            "a": 2,
            "b": 5,
            "this": [
                {
                    "a": 2,
                    "b": 5,
                    "this": []
                }
            ]
        }
    ],
    "match": 4,
    sf: 1,
    A: {
        a: 1,
        b: [{
            a: 1,
            b: [],
        }],
    },
    B: [1,'2']
}, `
type sf.a uint
type B [
    int?,
    ...str
]
type A {
    a: uint
    b: A[]
}
{
    @mock(1)
    regex : /^\\d$/
    /regex1/ : int
    # a
    # b
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
    # any 匹配任何东西
    any : any
    # never 不匹配任何东西
    never? : never
    @mockKey(1)
    $rest : any
    sub : {
        a : this.int | this.str
        b : self.regex * self.regex + 1
        this : this.sub
    }[]
    @mock(6)
    match : match self.regex {
        case 2 => 2 * 2
        case any => 3 * 2
    }
    sf: sf.a
    A: A
    B: B
}`))

console.timeEnd('parse')