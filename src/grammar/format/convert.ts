import { types } from '../../'
import { Node, Type } from '../interface'
import style from './style'

class Context {
    root = null
    inkey = false
}

interface Table {
    start: (any) => string
    router: (any, context: Context) => string
    [x: number]: (node: any, context: Context) => string
}

const binaryOperators = {
    '|': true,
    '&': true,
    '*': true,
    '/': true,
    '%': true,
    '<<': true,
    '>>': true,
    '>>>': true,
    '+': true,
    '-': true,
    '<=': true,
    '>=': true,
    '<': true,
    '>': true,
    '===': true,
    '!==': true,
    '==': true,
    '!=': true,
    '^': true,
    '&&': true,
    '||': true,
}

const unaryOperators = {
    '+': true,
    '-': true,
    '!': true,
    '~': true,
}

const TPL_CONTAINER = `<pre class="lier-container">{lines}</pre>`

const TPL_LINE = `<div class="lier-line">{ranges}</div>`

const TPL_RANGE = `<div class="lier-range lier-{class}">{range}</div>`

const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;',
}

const renderRange = (text, type) => {
    return TPL_RANGE.replace('{class}', type).replace('{range}', text)
}

const renderLine = (text) => {
    return TPL_LINE.replace('{ranges}', text)
}

const renderContainer = (text) => {
    return TPL_CONTAINER.replace('{lines}', text)
}

const escape = (value) => {
    return String(value).replace(/[&<>"']/g, l => {
        return htmlEscapes[l] || l
    })
}

const isdescription = (decorate) => {
    return decorate.name === '_' || decorate.name === 'description'
}

const ismock = (decorate) => {
    return decorate.name === 'mock'
}

const isarray = (target) => {
    return target && (target instanceof Array)
}

const table: Table = {
    start: node => {
        const context = new Context()
        context.root = node
        return renderContainer(table.router(node, context) || '')
    },
    router: (node, context) => {
        if (!node) {
            return node
        }

        if (node instanceof Array) {
            const tags = []
            tags.push(renderRange('(', style.groupStart))
            if (node.length) {
                for (const item of node) {
                    tags.push(table.router(item, context))
                    tags.push(renderRange(', ', style[',']))
                }
                tags.pop()
            }
            tags.push(renderRange(')', style.groupEnd))
            return tags.join('')
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

        if (unaryOperators[operator]) {
            const tags = []
            tags.push(renderRange(operator, style.operator))
            tags.push(argument)
            return tags.join('')
        }

        throw new Error('not implemented unary operator:' + operator)
    },
    [Type.member]: (node, context) => {
        let self = node
        const members = []
        while (self) {
            if (self.type === Type.member) {
                if (isarray(self.property)) {
                    const propertys = []
                    if (self.property.length) {
                        for (const item of self.property) {
                            propertys.unshift(table.router(item, context))
                            propertys.unshift(renderRange(', ', style[',']))
                        }
                        propertys.pop()
                    }
                    members.unshift(renderRange(']', style.arrayEnd))
                    members.unshift(propertys.join(''))
                    members.unshift(renderRange('[', style.arrayStart))
                } else {
                    members.unshift(renderRange(self.property.value, style.path))
                    members.unshift(renderRange('.', style['.']))
                }
            } else {
                members.unshift(table.router(self, context))
            }
            self = self.object
        }
        return members.join('')
    },
    [Type.binary]: (node, context) => {
        const operator = node.operator
        const left = table.router(node.left, context)
        const right = table.router(node.right, context)

        if (binaryOperators[operator]) {
            const tags = []
            tags.push(left)
            tags.push(renderRange(operator, style.operator))
            tags.push(right)
            return tags.join('')
        }

        throw new Error('not implemented binary operator:' + operator)
    },
    [Type.object]: (node, context) => {
        const tags = []
        tags.push(renderRange('{', style.blockStart))
        for (const property of node.properties) {
            context.inkey = true
            const key = table.router(property.key, context)
            context.inkey = false
            const value = table.router(property.value, context)
            property.decorators.sort((left, right) => {
                return +!isdescription(left) - +!isdescription(right)
            })
            for (const decorate of property.decorators) {
                if (!types[decorate.name]) {
                    throw new Error('not implemented decorate:' + decorate.name)
                }

                const line = []
                if (isdescription(decorate)) {
                    const arg0 = decorate.arguments.length ? decorate.arguments[0] : null
                    if (arg0 && arg0.type === Type.type && arg0.value.type === Type.string) {
                        line.push(renderRange('#\x20', style.comment))
                        line.push(renderRange(escape(arg0.value.value), style.description))
                    }
                } else {
                    const args = []
                    if (decorate.arguments.length) {
                        for (const item of decorate.arguments) {
                            args.push(table.router(item, context))
                            args.push(renderRange(',', style[',']))
                        }
                        args.pop()
                    }
                    if (ismock(decorate)) {
                        const ranges = []
                        ranges.push(renderRange('@\x20', style.comment))
                        ranges.push(args.join(''))
                        line.push(renderRange(ranges.join(''), style.mock))
                    } else {
                        const ranges = []
                        ranges.push(renderRange('@', style['@']))
                        ranges.push(renderRange(decorate.name, style.decorate))
                        ranges.push(renderRange('(', style.groupStart))
                        ranges.push(args.join(''))
                        ranges.push(renderRange(')', style.groupEnd))
                        line.push(ranges.join(''))
                    }
                }
                tags.push(renderLine(line.join('')))
            }
            const line = []
            line.push(key)
            if (property.optional) {
                line.push(renderRange('?', style['?']))
            }
            line.push(renderRange(':', style[':']))
            line.push(value)
            line.push(renderRange('', style.wrapup))
            tags.push(renderLine(line.join('')))
        }
        tags.push(renderRange('}', style.blockEnd))
        return tags.join('')
    },
    [Type.enum]: (node, context) => {
        const tags = []
        tags.push(renderRange('enum', style.enum))
        tags.push(renderRange('\x20', style.blank))
        tags.push(renderRange('{', style.blockStart))
        const line = []
        if (node.arguments.length) {
            for (const item of node.arguments) {
                line.push(table.router(item, context))
                line.push(renderRange(',', style[',']))
            }
            line.pop()
        }
        tags.push(renderLine(line.join('')))
        tags.push(renderRange('}', style.blockEnd))
        return tags.join('')
    },
    [Type.match]: (node, context) => {
        const test = table.router(node.test, context)
        const tags = []
        tags.push(renderRange('match', style.match))
        tags.push(renderRange(test, style.matchTest))
        tags.push(renderRange('{', style.blockStart))
        for (const { test, value } of node.cases) {
            const line = []
            line.push(renderRange('case', style.case))
            line.push(table.router(test, context))
            line.push(renderRange('=>', style.operator))
            line.push(table.router(value, context))
            tags.push(renderLine(line.join('')))
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
        const tags = []
        tags.push(renderRange('[', style.arrayStart))
        if (node.value.length) {
            for (const item of node.value) {
                const value = table.router(item, context)
                tags.push(value)
                tags.push(renderRange(',', style[',']))
            }
            tags.pop()
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
    [Type.null]: (node, context) => {
        return renderRange(null, style.identifier)
    },
    [Type.self]: (node, context) => {
        return renderRange('self', style.self)
    },
    [Type.this]: (node, context) => {
        return renderRange('this', style.this)
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
        return renderRange(node.value, context.inkey ? style.key.regex : style.regex)
    },
    [Type.type]: (node, context) => {
        if (node.value.type === Type.identifier && !types.hasOwnProperty(node.value.value)) {
            throw new Error('not implemented type:' + node.value.value)
        }
        const value = table.router(node.value, context)
        return value
    },
    [Type.spread]: (node, context) => {
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
    }
}

export default (ast: Node): string => {
    return table.start(ast)
}
