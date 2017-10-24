import * as lier from '../../src'

const base = lier.parse(`({
    @_('d1')
    a: any
    @_('d2')
    c: any
})[]`)

console.log(lier.stringify(lier.deduction([{
    a: 1,
    b: '213'
}], base)))
