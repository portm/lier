import * as lier from '../../interface'
import convert from './convertor'
import decorate from './decorator'
import zip from './zipper'

export interface Options {
    base?: lier.Node[]
    rate?: number
}

export default (data, options?: Options): lier.Node[] => {
    let ast = convert(data)
    if (options) {
        ast = zip(ast, options.rate)
        if (options.base) {
            decorate(ast, options.base)
        }
    } else {
        ast = zip(ast)
    }
    return ast
}
