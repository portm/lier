import * as lier from '../../src'

const base = lier.parse(`{
    a: ({
        @_('d1')
        a: any
        @_('d2')
        c: any
    })[]
}[]`)


console.time('parse')
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
console.timeEnd('parse')

console.log(lier.validatex([1, 1], `[1, uint]`))