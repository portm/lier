import { types } from '../../'
import { Node, Type } from '../interface'
import style from './style'

class Context {
    inkey = false
    declares: string[] = []
}

interface Table {
    start: (any) => string
    router: (any, context: Context) => string
    [x: number]: (node: any, context: Context) => string
}

const TPL_CONTAINER = `<pre class="lier-container">{lines}</pre>`

const TPL_LINE = `<div class="lier-line">{ranges}</div>`

const TPL_BLOCK = `<div class="lier-block">{ranges}</div>`

const TPL_LAYOUT = `<div class="lier-layout">{ranges}</div>`

const TPL_RANGE = `<div class="lier-range lier-{class}">{range}</div>`

const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;',
}

const renderRange = (text, type) => {
    return TPL_RANGE.replace('{class}', type).replace('{range}', () => text)
}

const renderLine = (text) => {
    return TPL_LINE.replace('{ranges}', () => text)
}

const renderBlock = (text) => {
    return TPL_BLOCK.replace('{ranges}', () => text)
}

const renderContainer = (text) => {
    return TPL_CONTAINER.replace('{lines}', () => text)
}

const renderLayout = (text) => {
    return TPL_LAYOUT.replace('{ranges}', () => text)
}

const escape = (value) => {
    return String(value).replace(/[&<>"']/g, l => {
        return htmlEscapes[l] || l
    })
}

const isarray = (target) => {
    return target && (target instanceof Array)
}

const table: Table = {
    start: node => {
        const context = new Context()
        const tags = []
        for (const item of node) {
            let value = table.router(item, context)
            if (item.type === Type.comment) {
                value = renderLine(value)
            }
            tags.push(value)
        }
        return renderContainer(context.declares.concat(tags).join(''))
    },
    router: (node, context) => {
        if (!node) {
            return node
        }

        const handler = table[node.type]

        if (!handler) {
            return node
        }

        return handler(node, context)
    },
    [Type.unary]: (node, context) => {
        const operator = node.operator
        const argument = table.router(node.argument, context)

        const tags = []
        tags.push(renderRange(operator, style.operator))
        tags.push(argument)
        return tags.join('')

    },
    [Type.member]: (node, context) => {
        const members = [table.router(node.object, context)]
        for (const property of node.properties) {
            members.push(table.router(property, context))
        }
        return members.join('')
    },
    [Type.binary]: (node, context) => {
        const operator = node.operator
        const left = table.router(node.left, context)
        const right = table.router(node.right, context)

        const tags = []
        tags.push(left)
        tags.push(renderRange(operator, style.operator))
        tags.push(right)
        return tags.join('')
    },
    [Type.object]: (node, context) => {
        const tags = []
        tags.push(renderRange('{', style.blockStart))
        if (node.properties.length) {
            const inner = []
            for (const property of node.properties) {
                if (property.type !== Type.property) {
                    inner.push(renderLine(table.router(property, context)))
                    continue
                }
                context.inkey = true
                const key = table.router(property.key, context)
                context.inkey = false
                const value = table.router(property.value, context)
                for (const decorate of property.decorators) {
                    const line = []
                    const args = []
                    if (decorate.arguments.length) {
                        for (const item of decorate.arguments) {
                            args.push(table.router(item, context))
                            args.push(renderRange(',', style[',']))
                        }
                        args.pop()
                    }
                    const ranges = []
                    ranges.push(renderRange('@', style['@']))
                    ranges.push(renderRange(decorate.name, style.decorate))
                    ranges.push(renderRange('(', style.groupStart))
                    ranges.push(args.join(''))
                    ranges.push(renderRange(')', style.groupEnd))
                    line.push(renderRange(ranges.join(''), style.comment))
                    inner.push(renderLine(line.join('')))
                }
                const line = []
                line.push(key)
                if (property.optional) {
                    line.push(renderRange('?', style['?']))
                }
                line.push(renderRange(':', style[':']))
                line.push(value)
                line.push(renderRange('', style.wrapup))
                inner.push(renderLine(line.join('')))
            }
            tags.push(renderBlock(inner.join('')))
        }
        tags.push(renderRange('}', style.blockEnd))
        return tags.join('')
    },
    [Type.enum]: (node, context) => {
        const tags = []
        tags.push(renderRange('enum', style.enum))
        tags.push(renderRange('\x20', style.blank))
        tags.push(renderRange('{', style.blockStart))
        if (node.arguments.length) {
            const inner = []
            let first = true
            for (let i = node.arguments.length - 1; i >= 0; -- i) {
                const item = node.arguments[i]
                const line = []
                line.push(table.router(item, context))
                if (item.type !== Type.comment) {
                    if (!first) {
                        line.push(renderRange(',', style[',']))
                    } else {
                        first = false
                    }
                }
                inner.unshift(renderLine(line.join('')))
            }
            tags.push(renderBlock(inner.join('')))
        }
        tags.push(renderRange('}', style.blockEnd))
        return tags.join('')
    },
    [Type.match]: (node, context) => {
        const test = table.router(node.test, context)
        const tags = []
        tags.push(renderRange('match', style.match))
        tags.push(renderRange(test, style.matchTest))
        tags.push(renderRange('{', style.blockStart))
        if (node.cases.length) {
            const inner = []
            for (const cs of node.cases) {
                if (cs.type === Type.comment) {
                    inner.push(renderLine(table.router(cs, context)))
                    continue
                }
                const line = []
                line.push(renderRange('case', style.case))
                line.push(table.router(cs.test, context))
                line.push(renderRange('=>', style.operator))
                line.push(table.router(cs.value, context))
                inner.push(renderLine(line.join('')))
            }
            tags.push(renderBlock(inner.join('')))
        }
        tags.push(renderRange('}', style.blockEnd))
        return tags.join('')
    },
    [Type.call]: (node, context) => {
        const callee = table.router(node.callee, context)
        const tags = []
        tags.push(callee)
        tags.push(renderRange('(', style.groupStart))
        if (node.arguments.length) {
            for (const arg of node.arguments) {
                tags.push(table.router(arg, context))
                tags.push(renderRange(',', style[',']))
            }
            tags.pop()
        }
        tags.push(renderRange(')', style.groupEnd))
        return tags.join('')
    },
    [Type.array]: (node, context) => {
        return `${table.router(node.value, context)}[]`
    },
    [Type.tuple]: (node, context) => {
        const tags = []
        tags.push(renderRange('[', style.arrayStart))
        if (node.value.length) {
            const inner = []
            let first = true
            for (let i = node.value.length - 1; i >= 0; -- i) {
                const item = node.value[i]
                const line = []
                line.push(table.router(item, context))
                if (item.type !== Type.comment) {
                    if (!first) {
                        line.push(renderRange(',', style[',']))
                    } else {
                        first = false
                    }
                }
                inner.unshift(renderLine(line.join('')))
            }
            tags.push(renderBlock(inner.join('')))
        }
        tags.push(renderRange(']', style.arrayEnd))
        return tags.join('')
    },
    [Type.identifier]: (node, context) => {
        if (context.inkey) {
            if (node.value.charAt(0) === '$') {
                return renderRange(node.value, style.key.$)
            }
            return renderRange(node.value, style.key.identifier)
        }
        return renderRange(node.value, style.identifier)
    },
    [Type.path]: (node, context) => {
        const ret = []
        if (node.computed) {
            ret.push(renderRange('[', style.arrayStart))
            ret.push(table.router(node.value, context))
            ret.push(renderRange(']', style.arrayEnd))
        } else {
            ret.push(renderRange('.', style['.']))
            if (node.value.type === Type.identifier) {
                ret.push(renderRange(node.value.value, style.path))
            } else {
                ret.push(table.router(node.value, context))
            }
        }
        return ret.join('')
    },
    [Type.null]: (node, context) => {
        return renderRange(null, style.identifier)
    },
    [Type.self]: (node, context) => {
        return renderRange('self', style.self)
    },
    [Type.boolean]: (node, context) => {
        return renderRange(node.value, context.inkey ? style.key.identifier : style.identifier)
    },
    [Type.number]: (node, context) => {
        return renderRange(node.value, context.inkey ? style.key.number : style.number)
    },
    [Type.string]: (node, context) => {
        return renderRange(
            `'${escape(node.value.replace('\'', '\\\''))}'`, context.inkey ? style.key.string : style.string)
    },
    [Type.regular]: (node, context) => {
        return renderRange(node.value.source, context.inkey ? style.key.regex : style.regex)
    },
    [Type.rest]: (node, context) => {
        const tags = []
        tags.push(renderRange('...', style['...']))
        tags.push(table.router(node.value, context))
        return tags.join('')
    },
    [Type.optional]: (node, context) => {
        const tags = []
        tags.push(table.router(node.value, context))
        tags.push(renderRange('?', style['?']))
        return tags.join('')
    },
    [Type.element]: (node, context) => {
        for (const declare of node.declarations) {
            context.declares.push(table.router(declare, context))
        }
        return renderLayout(table.router(node.assignment, context))
    },
    [Type.comment]: (node, context) => {
        return renderRange(`# ${String(node.value).trim()}`, style.comment)
    },
    [Type.declare]: (node, context) => {
        const tags = []
        tags.push(renderRange('type', style.type))
        const paths = node.path.slice(1)
        const object = node.path[0]
        const name = []
        name.push(renderRange(object.value, style.identifier))
        for (const path of paths) {
            if (path.type === Type.identifier) {
                name.push(renderRange('.', style['.']))
                name.push(renderRange(path.value, style.path))
            } else {
                name.push(renderRange('[', style.arrayStart))
                name.push(table.router(path, context))
                name.push(renderRange(']', style.arrayEnd))
            }
        }
        tags.push(renderRange(name.join(''), style.typePath))
        tags.push(table.router(node.value, context))
        return renderLayout(tags.join(''))
    },
}

export default (ast: Node[]): string => {
    return table.start(ast)
}
