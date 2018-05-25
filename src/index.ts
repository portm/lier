import * as _ from 'lodash'
import { compile, deduction, format, formatByAst, parse, stringify, check as checkLang } from './grammar'
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

function defaultDeps (declares, defaultsDeclares = {}) {
    const deps = {}
    for (const key of Object.keys(defaultsDeclares)) {
        const tree = compile(parse(defaultsDeclares[key]))
        deps[key] = tree.assignment
    }
    return _.defaultsDeep(deps, declares)
}

function assertx (data, lang, declares?) {
    const tree = compile(parse(lang))
    return assert(data, tree.assignment, defaultDeps(tree.declares, declares))
}

function validatex (data, lang, declares?) {
    const tree = compile(parse(lang))
    return validate(data, tree.assignment, defaultDeps(tree.declares, declares))
}

function mockx (lang, declares?) {
    const tree = compile(parse(lang))
    return mock(tree.assignment, defaultDeps(tree.declares, declares))
}

function check (lang, declares?) {
    return checkLang(parse(lang), declares)
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
    check,
}
