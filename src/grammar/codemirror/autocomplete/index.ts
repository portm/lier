import decorates from './decorates'
import dollar from './dollar'
import types from './types'

const levelUp = list => {
    return item => {
        const index = list.indexOf(item)
        if (index === -1) {
            return
        }
        ++item.weight

        let left = 0,
            right = index

        while (left <= right) {
            const mid = Math.floor((left + right) / 2)

            if (list[mid].weight > item.weight) {
                left = mid + 1
            } else {
                right = mid - 1
            }
        }

        const mid = Math.max(left, right)

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

export default CodeMirror => {
    const hintTips = (editor, list, levelUp, line, start, end = start) => {
        editor.showHint({
            completeSingle: false,
            hint: function (editor, option) {
                const data = {
                    list,
                    from: CodeMirror.Pos(line, end),
                    to: CodeMirror.Pos(line, start),
                }

                CodeMirror.on(data, 'pick', (el) => {
                    levelUp(el)
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

    const hint = (editor, change) => {
        const cursor = editor.getCursor()
        const token = editor.getTokenAt(cursor)

        if (!token) {
            return
        }

        if (token.type === 'colon') {
            // editor.operation(() => editor.replaceSelection(' '));
            // hintTips(editor, types, levelUp(types), cursor.line, cursor.ch + 1, cursor.ch + 1);
            hintTips(editor, types, levelUp(types), cursor.line, cursor.ch, cursor.ch)
            return
        }

        if (token.type === 'at') {
            hintTips(editor, decorates, levelUp(decorates), cursor.line, cursor.ch, cursor.ch)
            return
        }

        const line = editor.getLine(cursor.line)
        let word = line.slice(token.start, token.end)
        const offsetStart = word.length - (word = word.replace(/^\s+/, '')).length
        const offsetEnd = word.length - (word = word.replace(/\s+$/, '')).length

        if (token.type === 'key-dollar') {
            hintTips(
                editor,
                dollar.filter(i => i.text.indexOf(word) === 0),
                levelUp(dollar),
                cursor.line,
                token.start + offsetStart,
                token.end + offsetEnd,
            )
            return
        }

        if (token.type === 'identifier') {
            hintTips(
                editor,
                types.filter(i => i.text.indexOf(word) === 0),
                levelUp(types),
                cursor.line,
                token.start + offsetStart,
                token.end + offsetEnd,
            )
            return
        }

        if (token.type === 'decorate') {
            hintTips(
                editor,
                decorates.filter(i => i.text.indexOf(word) === 0),
                levelUp(decorates),
                cursor.line,
                token.start + offsetStart,
                token.end + offsetEnd,
            )
            return
        }

        hintTips(editor, [], null, 0, 0, 0)
    }

    return hint
}
