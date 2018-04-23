import { compile, deduction, format, formatByAst, parse, stringify } from './grammar'
import { Options, LierError } from './interfaces'
import mock from './mock'
import types from './types'
import validate from './validate'

function assert (data, type, declares?) {
    const errs = validate(data, type, declares)

    if (errs) {
        throw new Error(JSON.stringify(errs))
    }
}

function assertx (data, lang) {
    const tree = compile(parse(lang))
    return assert(data, tree.assignment, tree.declares)
}

function validatex (data, lang) {
    const tree = compile(parse(lang))
    return validate(data, tree.assignment, tree.declares)
}

function mockx (lang) {
    const tree = compile(parse(lang))
    return mock(tree.assignment, tree.declares)
}

export {
    validate,
    validatex,
    mock,
    mockx,
    types,
    assert,
    assertx,
    parse,
    compile,
    stringify,
    format,
    formatByAst,
    deduction,
}
