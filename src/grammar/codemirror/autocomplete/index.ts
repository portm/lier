import decorates from './decorates'
import dollar from './dollar'
import types from './types'

const up = list => {
    return item => {
        const index = list.indexOf(item)
        if (index === -1) {
            return
        }
        ++item.weight
        let low = 0
        let high = index
        let mid = 0
        while (low <= high) {
            mid = (low + high) >> 1
            const middle = list[mid]
            const prev = mid === 0 ? Infinity : list[mid - 1].weight
            if (item.weight >= middle.weight && item.weight < prev) {
                break
            }
            if (middle.weight > item.weight) {
                low = mid + 1
            } else {
                high = mid - 1
            }
        }
        if (list[mid] === list[index]) {
            return
        }
        list.splice(index, 1)
        list.splice(mid, 0, item)
    }
}

const initList = list => {
    list.sort((a, b) => {
        return a.displayText.localeCompare(b.displayText)
    })
    list.forEach(i => i.weight = 0)
}

initList(types)

initList(decorates)

initList(dollar)

const tips = (CodeMirror, editor, list, up, line, start, end = start) => {
    editor.showHint({
        completeSingle: false,
        hint: function (editor, option) {
            const data = {
                list,
                from: CodeMirror.Pos(line, end),
                to: CodeMirror.Pos(line, start),
            }

            CodeMirror.on(data, 'pick', (el) => {
                up(el)
                if (el.select) {
                    const cursor = editor.getCursor()
                    editor.setSelection(
                        { line: el.select[2] || cursor.line, ch: cursor.ch - el.select[1] },
                        { line: el.select[2] || cursor.line, ch: cursor.ch - el.select[0] },
                    )
                }
            })

            return data
        },
    })
}

export {
    types,
    decorates,
    dollar,
    tips,
    up,
}

const defaultOnHint = (event: {
    CodeMirror: any
    editor: any
    type: string
    line: number
    start: number
    end: number
    word?: string
    token: any
    cursor: any
}): void => {
    if (event.type === 'colon') {
        tips(
            event.CodeMirror,
            event.editor,
            types,
            up(types),
            event.line,
            event.start,
            event.end
        )
        return
    }
    if (event.type === 'at') {
        tips(
            event.CodeMirror,
            event.editor,
            decorates,
            up(decorates),
            event.line,
            event.start,
            event.end
        )
        return
    }
    if (event.type === 'key-dollar') {
        tips(
            event.CodeMirror,
            event.editor,
            dollar.filter(i => i.text.indexOf(event.word) === 0),
            up(dollar),
            event.line,
            event.start,
            event.end
        )
        return
    }

    if (event.type === 'identifier') {
        tips(
            event.CodeMirror,
            event.editor,
            types.filter(i => i.text.indexOf(event.word) === 0),
            up(types),
            event.line,
            event.start,
            event.end
        )
        return
    }

    if (event.type === 'decorate') {
        tips(
            event.CodeMirror,
            event.editor,
            decorates.filter(i => i.text.indexOf(event.word) === 0),
            up(decorates),
            event.line,
            event.start,
            event.end
        )
        return
    }

    tips(
        event.CodeMirror,
        event.editor,
        [],
        null,
        event.line,
        event.start,
        event.end
    )
}

export default (CodeMirror, onHint = defaultOnHint) => {

    const hint = (editor, change) => {
        const cursor = editor.getCursor()
        const token = editor.getTokenAt(cursor)

        if (!token) {
            return
        }

        if (token.type === 'colon' || token.type === 'at') {
            // editor.operation(() => editor.replaceSelection(' '));
            // hintTips(editor, types, levelUp(types), cursor.line, cursor.ch + 1, cursor.ch + 1);
            onHint({
                CodeMirror,
                editor,
                type: token.type,
                line: cursor.line,
                start: cursor.ch,
                end: cursor.ch,
                token,
                cursor,
            })
            return
        }

        const line = editor.getLine(cursor.line)
        let word = line.slice(token.start, token.end)
        const offsetStart = word.length - (word = word.replace(/^\s+/, '')).length
        const offsetEnd = word.length - (word = word.replace(/\s+$/, '')).length

        if (token.type === 'key-dollar' || token.type === 'identifier' || token.type === 'decorate') {
            onHint({
                CodeMirror,
                editor,
                type: token.type,
                line: cursor.line,
                start: token.start + offsetStart,
                end: token.end + offsetEnd,
                word,
                token,
                cursor,
            })
            return
        }

        onHint({
            CodeMirror,
            editor,
            type: token.type,
            line: cursor.line,
            start: cursor.ch,
            end: cursor.ch,
            token,
            cursor,
        })
    }

    return hint
}
