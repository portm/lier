import * as lier from '../../src'
import inspect from '../../src/inspect'

const { str, Enum } = lier.types

const ret = lier.validate(
    {a: {b: 1}, c: 1},
    {a: str, c: Enum(2, 3, 4)},
)

console.log(ret + '')
