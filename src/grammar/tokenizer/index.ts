import Context from './context'
import { Stream, Style } from './interface.d'
import State from './state'

export interface Table {
    [x: number]: (stream: Stream, context: Context) => string
    router: (stream: Stream, context: Context) => string
}

const operatorRegex = new RegExp('^(?:' + [
    '>=', '!==', '!=', '===', '==', '&&', '||',
    '%', '<<', '>>>', '>>', '<=',
    '+', '-', '*', '^', '|', '&', '>', '<',
].map(i => i.replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1')).join('|') + ')')

const tokenizer = (style: Style) => {
    const table: Table = {
        router: (stream, context) => {
            // console.log(context.state.map(i => State[i]), stream.peek())
            const state = context.state[context.state.length - 1]
            const handle = table[state]

            if (!handle) {
                return null
            }

            const ret = handle(stream, context)
            if (stream.pos === stream.string.length) {
                if (context.commitIndent > context.pushIndent) {
                    context.pushIndent = context.commitIndent
                    ++ context.indent
                } else if (context.commitIndent < context.pushIndent) {
                    context.pushIndent = context.commitIndent
                    -- context.indent
                }
            }
            return ret
        },

        [State.start]: (stream, context) => {
            context.state.pop()
            context.state.push(State.error)
            context.state.push(State.expressionStart)
            return table.router(stream, context)
        },

        [State.empty]: (stream, context) => {
            const blank = /^\s+/
            if (stream.match(blank)) {
                return style.blank
            }
            const comment = /^(?:#.*|\/\/.*)+/
            if (stream.match(comment)) {
                return style.comment
            }
            context.state.pop()
            if (stream.eol()) {
                context.state.push(State.empty)
                return style.blank
            }
            const mutil = /^\/\*/
            if (stream.match(mutil)) {
                context.state.push(State.mutilEmpty)
                return style.comment
            }
            return table.router(stream, context)
        },

        [State.mutilEmpty]: (stream, context) => {
            const regex = /^(?:(?!\*\/).)+/
            if (stream.match(regex)) {
                return style.comment
            }
            context.state.pop()
            const mutil = /^\*\//
            if (stream.match(mutil)) {
                context.state.push(State.empty)
                return style.comment
            }
            if (stream.eol()) {
                context.state.push(State.mutilEmpty)
                return style.comment
            }
            return table.router(stream, context)
        },

        [State.unary]: (stream, context) => {
            const unary = /[!~+-]/
            const peek = stream.peek()
            context.state.pop()

            if (unary.test(peek)) {
                context.state.push(State.memberStart)
                context.state.push(State.empty)
                stream.next()
                return style.operator
            }

            context.state.push(State.memberStart)
            context.state.push(State.empty)
            return table.router(stream, context)
        },

        [State.expressionListStart]: (stream, context) => {
            context.state.pop()
            context.state.push(State.expressionList)
            context.state.push(State.expressionStart)
            return table.router(stream, context)
        },

        [State.expressionList]: (stream, context) => {
            if (stream.peek() === ',') {
                context.state.push(State.expressionStart)
                stream.next()
                return style[',']
            }

            context.state.pop()
            return table.router(stream, context)
        },

        [State.expressionStart]: (stream, context) => {
            context.state.pop()
            context.state.push(State.expression)
            context.state.push(State.empty)
            context.state.push(State.unary)
            context.state.push(State.empty)
            return table.router(stream, context)
        },

        [State.expression]: (stream, context) => {
            if (stream.match(operatorRegex)) {
                context.state.push(State.expression)
                context.state.push(State.empty)
                context.state.push(State.unary)
                return style.operator
            }

            const peek = stream.peek()

            if (peek === '/') {
                const regex = /^\/([^\/]+)\/([im]*)/
                const match = stream.string.slice(stream.pos).match(regex)
                if (match) {
                    try {
                        new RegExp(match[1], match[2] || '')
                    } catch (exp) {
                        context.state.push(State.expression)
                        context.state.push(State.empty)
                        context.state.push(State.unary)
                        context.state.push(State.empty)
                        stream.next()
                        return style.operator
                    }
                } else {
                    context.state.push(State.expression)
                    context.state.push(State.empty)
                    context.state.push(State.unary)
                    context.state.push(State.empty)
                    stream.next()
                    return style.operator
                }
            }

            context.state.pop()
            return table.router(stream, context)
        },

        [State.primary]: (stream, context) => {
            const peek = stream.peek()
            context.state.pop()

            if (peek === '[') {
                ++ context.commitIndent
                context.state.push(State.array)
                context.state.push(State.empty)
                stream.next()
                return style.arrayStart
            }

            if (peek === '(') {
                ++ context.commitIndent
                context.state.push(State.groupStart)
                context.state.push(State.empty)
                stream.next()
                return style.groupStart
            }

            if (peek === '{') {
                ++ context.commitIndent
                context.state.push(State.property)
                context.state.push(State.empty)
                stream.next()
                return style.blockStart
            }

            if (peek === '\'' || peek === '"') {
                context.backed = false
                context.string = peek
                context.style = style.string
                context.state.push(State.string)
                return table.router(stream, context)
            }

            if (peek === '`') {
                context.backed = false
                context.style = style.string
                context.state.push(State.backtickString)
                stream.next()
                return style.string
            }

            const regex = /^\/(?:[^\/\\]*|\\.)+\/([im]*)/
            if (stream.match(regex)) {
                context.state.push(State.empty)
                return style.regex
            }

            const _enum = /^enum(?=\s|$)/
            if (stream.match(_enum)) {
                context.state.push(State.enumStart)
                context.state.push(State.empty)
                return style.enum
            }

            const match = /^match(?=\s|$)/
            if (stream.match(match)) {
                context.state.push(State.matchStart)
                context.state.push(State.expressionStart)
                return style.match
            }

            const identifier = /[$a-zA-Z_]/
            if (identifier.test(peek)) {
                const part = stream.string.slice(stream.pos)

                if (/^this(?=[^-$_0-9a-zA-Z]|$)/.test(part)) {
                    context.style = style.this
                } else if (/^self(?=[^-$_0-9a-zA-Z]|$)/.test(part)) {
                    context.style = style.self
                } else {
                    context.style = style.identifier
                }

                context.state.push(State.identifier)
                return table.router(stream, context)
            }

            const number = /[\d.]/
            if (number.test(peek)) {
                context.style = style.number
                context.state.push(State.number)
                return table.router(stream, context)
            }

            context.state.push(State.error)
            return table.router(stream, context)
        },

        [State.memberStart]: (stream, context) => {
            context.state.pop()
            context.state.push(State.member)
            context.state.push(State.empty)
            context.state.push(State.primary)
            return table.router(stream, context)
        },

        [State.member]: (stream, context) => {
            const peek = stream.peek()

            if (peek === '.') {
                context.style = style.path
                context.state.push(State.empty)
                context.state.push(State.identifier)
                context.state.push(State.empty)
                stream.next()
                return style['.']
            }

            if (peek === '[') {
                ++ context.commitIndent
                context.state.push(State.memberBracketStart)
                context.state.push(State.empty)
                stream.next()
                return style.memberStart
            }

            if (peek === '(') {
                ++ context.commitIndent
                context.state.push(State.argumentStart)
                context.state.push(State.empty)
                stream.next()
                return style.groupStart
            }

            context.state.pop()
            return table.router(stream, context)
        },

        [State.memberBracketStart]: (stream, context) => {
            const peek = stream.peek()
            context.state.pop()

            if (peek === ']') {
                -- context.commitIndent
                context.state.push(State.empty)
                stream.next()
                return style.memberEnd
            }

            context.state.push(State.memberBracket)
            context.state.push(State.empty)
            context.state.push(State.expressionListStart)
            return table.router(stream, context)
        },

        [State.memberBracket]: (stream, context) => {
            const peek = stream.peek()

            if (peek === ']') {
                -- context.commitIndent
                context.state.pop()
                context.state.push(State.empty)
                stream.next()
                return style.arrayEnd
            }

            context.state.push(State.error)
            return table.router(stream, context)
        },

        [State.property]: (stream, context) => {
            const peek = stream.peek()

            if (peek === '@') {
                context.state.push(State.decorateStart)
                stream.next()
                return style['@']
            }

            if (peek === '}') {
                -- context.commitIndent
                context.state.pop()
                stream.next()
                return style.blockEnd
            }

            context.state.push(State.propertyName)
            context.state.push(State.empty)
            return table.router(stream, context)
        },

        [State.decorateStart]: (stream, context) => {
            if (stream.match(/[a-zA-Z$_][-a-zA-Z0-9$_]*/)) {
                context.state.pop()
                context.state.push(State.decorate)
                context.state.push(State.empty)
                return style.decorate
            }

            context.state.push(State.error)
            return table.router(stream, context)
        },

        [State.decorate]: (stream, context) => {
            context.state.pop()

            if (stream.peek() === '(') {
                ++ context.commitIndent
                context.state.push(State.argumentStart)
                context.state.push(State.empty)
                stream.next()
                return style.groupStart
            }

            return table.router(stream, context)
        },

        [State.propertyName]: (stream, context) => {
            const peek = stream.peek()

            context.state.pop()
            context.state.push(State.propertyOptional)

            if (peek === '\'' || peek === '"') {
                context.backed = false
                context.string = peek
                context.style = style.key.string
                context.state.push(State.string)
                return table.router(stream, context)
            }

            if (peek === '`') {
                context.backed = false
                context.style = style.key.string
                context.state.push(State.backtickString)
                stream.next()
                return style.key.string
            }

            const regex = /^\/(?:[^\/\\]*|\\.)+\/([im]*)/
            if (stream.match(regex)) {
                context.state.push(State.empty)
                return style.key.regex
            }

            const identifier = /[$a-zA-Z_]/
            if (identifier.test(peek)) {
                if (peek === '$') {
                    context.style = style.key['$']
                } else {
                    context.style = style.key.identifier
                }
                context.state.push(State.identifier)
                return table.router(stream, context)
            }

            const number = /[\d.]/
            if (number.test(peek)) {
                context.style = style.key.number
                context.state.push(State.number)
                return table.router(stream, context)
            }

            context.state.push(State.error)
            return table.router(stream, context)
        },

        [State.propertyOptional]: (stream, context) => {
            context.state.pop()
            context.state.push(State.propertyValue)
            context.state.push(State.empty)

            if (stream.peek() === '?') {
                stream.next()
                return style['?']
            }
            return table.router(stream, context)
        },

        [State.propertyValue]: (stream, context) => {
            context.state.pop()

            if (stream.peek() === ':') {
                context.state.push(State.expressionStart)
                stream.next()
                return style[':']
            }

            context.state.push(State.error)
            return table.router(stream, context)
        },

        [State.identifier]: (stream, context) => {
            const regex = /^[$a-zA-Z_][A-Za-z0-9$_-]*/
            if (stream.match(regex)) {
                context.state.pop()
                context.state.push(State.empty)
                return context.style
            }

            context.state.push(State.error)
            return table.router(stream, context)
        },

        [State.number]: (stream, context) => {
            const regex = /^(?:0[xX][\da-fA-F]+|\d+\.?|\d*\.\d+(?:[eE]\d+)?)/
            if (stream.match(regex)) {
                context.state.pop()
                context.state.push(State.empty)
                return context.style
            }

            context.state.push(State.error)
            return table.router(stream, context)
        },

        [State.string]: (stream, context) => {
            const regex = new RegExp(`^${context.string}([^${context.string}\\\\]|\\\\.)*${context.string}`)
            if (stream.match(regex)) {
                context.string = ''
                context.backed = true
                context.state.pop()
                context.state.push(State.empty)
                return context.style
            }

            context.state.push(State.error)
            return table.router(stream, context)
        },

        [State.backtickString]: (stream, context) => {
            const regex = /^(?:[^`\\]|\\.)+/
            if (stream.match(regex)) {
                return context.style
            }
            if (stream.peek() === '`') {
                context.backed = true
                stream.next()
                context.state.pop()
                context.state.push(State.empty)
                return context.style
            }
            if (stream.eol()) {
                return context.style
            }

            context.state.push(State.error)
            return table.router(stream, context)
        },

        [State.groupStart]: (stream, context) => {
            context.state.pop()
            context.state.push(State.group)
            context.state.push(State.empty)
            context.state.push(State.expressionListStart)
            return table.router(stream, context)
        },

        [State.group]: (stream, context) => {
            const peek = stream.peek()

            if (peek === ')') {
                -- context.commitIndent
                context.state.pop()
                context.state.push(State.empty)
                stream.next()
                return style.groupEnd
            }

            context.state.push(State.error)
            return table.router(stream, context)
        },

        [State.argumentStart]: (stream, context) => {
            context.state.pop()

            if (stream.peek() === ')') {
                -- context.commitIndent
                context.state.push(State.empty)
                stream.next()
                return style.groupEnd
            }

            context.state.push(State.argument)
            context.state.push(State.empty)
            context.state.push(State.expressionListStart)
            return table.router(stream, context)
        },

        [State.argument]: (stream, context) => {
            const peek = stream.peek()
            if (peek === ')') {
                -- context.commitIndent
                context.state.pop()
                context.state.push(State.empty)
                stream.next()
                return style.groupEnd
            }

            context.state.push(State.error)
            return table.router(stream, context)
        },

        [State.array]: (stream, context) => {
            const peek = stream.peek()

            if (peek === ']') {
                -- context.commitIndent
                context.state.pop()
                context.state.push(State.empty)
                stream.next()
                return style.arrayEnd
            }

            if (peek === ',') {
                stream.next()
                return style[',']
            }

            context.state.pop()
            context.state.push(State.array)
            context.state.push(State.spread)
            return table.router(stream, context)
        },

        [State.spread]: (stream, context) => {
            context.state.pop()
            const regex = /^\.\.\./
            if (stream.match(regex)) {
                context.state.push(State.expressionStart)
            } else {
                context.state.push(State.optional)
                context.state.push(State.expressionStart)
            }
            return style['...']
        },

        [State.optional]: (stream, context) => {
            context.state.pop()
            if (stream.peek() === '?') {
                stream.next()
                context.state.push(State.empty)
                return style['?']
            }
            return table.router(stream, context)
        },

        [State.enumStart]: (stream, context) => {
            const peek = stream.peek()

            if (peek === '{') {
                ++ context.commitIndent
                context.state.pop()
                context.state.push(State.enum)
                context.state.push(State.empty)
                stream.next()
                return style.blockStart
            }

            context.state.push(State.error)
            return table.router(stream, context)
        },

        [State.enum]: (stream, context) => {
            const peek = stream.peek()
            context.state.pop()

            if (peek === '}') {
                -- context.commitIndent
                context.state.push(State.empty)
                stream.next()
                return style.blockEnd
            }

            context.state.push(State.enumEnd)
            context.state.push(State.empty)
            context.state.push(State.expressionListStart)
            return table.router(stream, context)
        },

        [State.enumEnd]: (stream, context) => {
            const peek = stream.peek()

            if (peek === '}') {
                -- context.commitIndent
                context.state.pop()
                context.state.push(State.empty)
                stream.next()
                return style.blockEnd
            }

            context.state.push(State.error)
            return table.router(stream, context)
        },

        [State.matchStart]: (stream, context) => {
            const peek = stream.peek()

            if (peek === '{') {
                ++ context.commitIndent
                context.state.pop()
                context.state.push(State.match)
                context.state.push(State.empty)
                stream.next()
                return style.blockStart
            }

            context.state.push(State.error)
            return table.router(stream, context)
        },

        [State.match]: (stream, context) => {
            const peek = stream.peek()

            if (peek === '}') {
                -- context.commitIndent
                context.state.pop()
                context.state.push(State.empty)
                stream.next()
                return style.blockEnd
            }

            const regex = /^case(?=\s|$)/
            if (stream.match(regex)) {
                context.state.push(State.matchValue)
                context.state.push(State.empty)
                context.state.push(State.expressionStart)
                context.state.push(State.empty)
                return style.case
            }

            context.state.push(State.error)
            return table.router(stream, context)
        },

        [State.matchValue]: (stream, context) => {
            const regex = /^=>/
            if (stream.match(regex)) {
                context.state.pop()
                context.state.push(State.expressionStart)
                return style.operator
            }

            context.state.push(State.error)
            return table.router(stream, context)
        },

        [State.error]: (stream, context) => {
            stream.skipToEnd()
            return style.error
        },
    }

    return table
}

export {
    Context,
    tokenizer,
}
