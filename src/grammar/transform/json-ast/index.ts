import * as lier from '../../interface'
import convert from './convertor'
import decorate from './decorator'
import zip from './zipper'

export default (data, prev?): lier.Node[] => {
    const ast = convert(data)
    zip(ast)
    if (prev) {
        decorate(ast, prev)
    }
    return ast
}
