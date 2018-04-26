import * as lier from '../../interface'
import convert from './convertor'
import decorate from './decorator'

export default (data, prev?): lier.Node[] => {
    const ast = convert(data)
    if (prev) {
        decorate(ast, prev)
    }
    return ast
}
