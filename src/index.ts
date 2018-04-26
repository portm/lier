import * as _ from 'lodash'
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

function assertx (data, lang, declares = {}) {
    const tree = compile(parse(lang))
    return assert(data, tree.assignment, _.defaultsDeep(declares, tree.declares))
}

function validatex (data, lang, declares = {}) {
    const tree = compile(parse(lang))
    return validate(data, tree.assignment, _.defaultsDeep(declares, tree.declares))
}

function mockx (lang, declares = {}) {
    const tree = compile(parse(lang))
    return mock(tree.assignment, _.defaultsDeep(declares, tree.declares))
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
