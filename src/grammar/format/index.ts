import { Node } from '../interface'
import convert from './convert'

export default (ast: Node) => {
    const html = convert(ast)
    return html
}
