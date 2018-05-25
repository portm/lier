import { Node } from '../interface'
import convert, {
    Context,
    Formatter,
    renderBlock,
    renderContainer,
    renderLayout,
    renderLine,
    renderRange,
    formatter,
    style,
} from './convert'

export {
    Context,
    Formatter,
    renderBlock,
    renderContainer,
    renderLayout,
    renderLine,
    renderRange,
    formatter,
    style,
}

export default (ast: Node[]) => {
    const html = convert(ast)
    return html
}
