import * as lier from '../../src'
import jsonschema2ast from '../../src/grammar/transform/jsonschema-ast'
import ast2jsonschema from '../../src/grammar/transform/ast-jsonschema'
import ast2slim from '../../src/grammar/transform/ast-slim'

const base = lier.parse(`{
    a: ({
        @_('d1')
        a: any
        @_('d2')
        c: any
    })[]
}[]`)





console.time('parse')

const allLier = `
type sf.a uint
type sf.b str
type B [
    {
        a: 1
    },
    int?,
    ...str
]
type A {
    a: uint
    b: A[]
}
type Sub {
    a : sf.a | sf.b
    b : self.regex * self.regex + 1
    this : Sub[]
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
        # 1
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
    sub : Sub[]
    @mock(6)
    match : match self.regex {
        case 2 => 2 * 2
        case any => 3 * 2
    }
    sf: sf.a
    A: A
    B: B
    @range(10, 15)
    C?: int
}`

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
    "sf": 1,
    "A": {
        "a": 1,
        "b": [{
            "a": 1,
            "b": [],
        }]
    },
    "B": [{"a":1},1, "2"]
}, allLier))

const schemaAst = jsonschema2ast({
    "$schema": "http://json-schema.org/draft-04/schema#",

    "definitions": {
        "address": {
            "description": "address",
            "type": "object",
            "properties": {
                "street_address": {
                    "description": "street_address",
                    "type": "string"
                },
                "city": {
                    "description": "city",
                    "type": "string"
                },
                "state": {
                    "description": "state",
                    "type": "integer",
                    minimum: 10,
                    maximum: 15,
                }
            },
            "required": ["street_address", "city", "state"]
        }
    },

    "type": "object",

    "description": "test",

    "properties": {
        "billing_address": {
            "description": "billing_address",
            "$ref": "#/definitions/address"
        },
        "shipping_address": {
            "description": "shipping_address",
            "allOf": [
                { "$ref": "#/definitions/address" },
                {
                    "properties": {
                        "type": {
                            description: 'type',
                            "enum": ["residential", "business"]
                        }
                    },
                    "required": ["type"]
                }
            ]
        }
    }
}
)

console.log(lier.stringify(schemaAst))

const schemaCompile = lier.compile(schemaAst)

console.log(lier.validate({
    billing_address: {
        street_address: 'a',
        city: 'a',
        state: 12
    },
    "shipping_address": {
        "street_address": "1600 Pennsylvania Avenue NW",
        "city": "Washington",
        "state": 13,
        "type": "business"
    }
}, schemaCompile.assignment, schemaCompile.declares))

console.log(lier.stringify(lier.parse(allLier)))
// console.log(JSON.stringify(ast2jsonschema(schemaAst), null, 4))
lier.types['as'] = (name, type) => type
const arrayTest = `
type a.b 1
[
    #aa
    'save',
    ['$', {
        @as('ast')
        a: int
    }],
    a.b
]
`
console.log(lier.stringify(lier.parse(arrayTest)))

console.log(lier.format(arrayTest))

console.log(lier.stringify(lier.deduction([
    {
        a: [
            // {
            //     b: '123',
            // },
            // {
            //     a: 1,
            //     b: '213',
            // },
            {
                a: 1,
            },
            {
                a: 1,
            }
        ]
    },
    {
        a: [
            // {
            //     b: '123',
            // },
            // {
            //     a: 1,
            //     b: '213',
            // },
            {
                a: 1,
            },
            // {
            //     b: '123',
            // }
        ]
    }
], base)))

console.log(JSON.stringify(ast2slim(schemaAst), null, 4))
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

console.log(lier.validatex([
    {
        "userId": 1,
        "userName": "test1",
        "displayName": "people a",
        "childrens": [
            {
                "userId": 3,
                "userName": "test3",
                "childrens": [
                    {
                        "userId": 5,
                        "userName": "test5"
                    }
                ]
            },
            {
                "userId": 4,
                "userName": "test4",
                "displayName": "people d"
            }
        ]
    },
    {
        "userId": 2,
        "userName": "test2"
    }
], `type UserInfo {
    userId: int
    userName: str
    displayName?: str
    childrens?: UserInfo[]
}
UserInfo[]`))

console.timeEnd('parse')