import { compile, deduction, format, formatByAst, parse, stringify } from './grammar'
import { Options, LierError } from './interfaces'
import mock from './mock'
import types from './types'
import validate from './validate'

function assert (data, type) {
    const errs = validate(data, type)

    if (errs) {
        throw new Error(JSON.stringify(errs))
    }
}

function assertx (data, lang) {
    return assert(data, compile(parse(lang)))
}

function validatex (data, lang) {
    return validate(data, compile(parse(lang)))
}

function mockx (lang) {
    return mock(compile(parse(lang)))
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
