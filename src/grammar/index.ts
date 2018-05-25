import { types } from '../'
import formatByAst from './format'
import * as Parser from './parser'
import {
    ast2grammar as stringify,
    ast2lier as compile,
    json2ast as deduction,
} from './transform'
import check from './check'

const parse = (input: string) => {
    try {
        return Parser.parse(input, {
            funcs : types,
        })
    } catch (exp) {
        if (exp.location) {
            exp.message = `Line ${exp.location.start.line}, column ${exp.location.start.column}: invalid token '${exp.found}'`
        }
        throw exp
    }
}

const format = (input: string) => {
    try {
        const ast = parse(input)
        return formatByAst(ast)
    } catch (exp) {
        return exp.message
    }
}

export {
    parse,
    stringify,
    compile,
    formatByAst,
    format,
    deduction,
    check,
}
