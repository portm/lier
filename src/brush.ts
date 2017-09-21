import * as _ from 'lodash'

const stripReg = /[\u001b\u009b][[()#;?]*([0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
const colorReg = /[\u001b\u009b][[()#;?]*([0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]|./g
const browserStyleEscapeReg = /%c/g

declare var global

const brush = {
    isEnabled: true,
    isBrowser: typeof global !== 'object',

    strip (str) {
        return str.replace(stripReg, '')
    },

    reset: genBrush('reset'),
    bold: genBrush('bold'),
    dim: genBrush('dim'),
    italic: genBrush('italic'),
    underline: genBrush('underline'),
    inverse: genBrush('inverse'),
    hidden: genBrush('hidden'),
    strikeThrough: genBrush('strikeThrough'),

    black: genBrush('black'),
    red: genBrush('red'),
    green: genBrush('green'),
    yellow: genBrush('yellow'),
    blue: genBrush('blue'),
    magenta: genBrush('magenta'),
    cyan: genBrush('cyan'),
    white: genBrush('white'),
    gray: genBrush('gray'),
    grey: genBrush('grey'),

    bgBlack: genBrush('bgBlack'),
    bgRed: genBrush('bgRed'),
    bgGreen: genBrush('bgGreen'),
    bgYellow: genBrush('bgYellow'),
    bgBlue: genBrush('bgBlue'),
    bgMagenta: genBrush('bgMagenta'),
    bgCyan: genBrush('bgCyan'),
    bgWhite: genBrush('bgWhite'),
}

const cliMap = {
    reset: [0, 0],
    bold: [1, 22],
    dim: [2, 22],
    italic: [3, 23],
    underline: [4, 24],
    inverse: [7, 27],
    hidden: [8, 28],
    strikeThrough: [9, 29],

    black: [30, 39],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    blue: [34, 39],
    magenta: [35, 39],
    cyan: [36, 39],
    white: [37, 39],
    gray: [90, 39],
    grey: [90, 39],

    bgBlack: [40, 49],
    bgRed: [41, 49],
    bgGreen: [42, 49],
    bgYellow: [43, 49],
    bgBlue: [44, 49],
    bgMagenta: [45, 49],
    bgCyan: [46, 49],
    bgWhite: [47, 49],
}

const browserMap = {
    reset: 'color: inherit',

    bold: 'font-weight: bold',
    italic: 'font-style: italic',
    underline: 'text-decoration: underline',
    hidden: 'visibility: hidden',
    strikeThrough: 'text-decoration: line-through',

    black: 'color: #333',
    red: 'color: #b70606',
    green: 'color: #119e2b',
    yellow: 'color: #af8a1b',
    blue: 'color: #411fbf',
    magenta: 'color: #d246e0',
    cyan: 'color: #166477',
    white: 'color: #fff',
    gray: 'color: #888',
    grey: 'color: #888',
}

function genBrush (key: string) {
    return function (str): string {
        if (brush.isEnabled) {
            const c = cliMap[key]
            return `\u001b[${c[0]}m${str}\u001b[${c[1]}m`
        } else {
            return str
        }
    }
}

function findCliKey (val: number) {
    for (const k in cliMap) {
        if (cliMap[k][0] === val)
            return k
    }
}

function log (str: string, type = 'log') {
    const styles = [] as string[]
    const styled = str.replace(colorReg, (m, p1) => {
        if (!p1) return m

        const k = findCliKey(+p1)
        if (k)
            styles.push(browserMap[k], browserMap.reset)
        return '%c'
    })
    console[type].apply(console, [styled, ...styles])
}

function browserify (str: string): string {
    return str.replace(colorReg, (m, p1) => {
        if (p1) {
            const k = findCliKey(+p1)
            if (k)
                return `<span style='${browserMap[k]}'>`
            else
                return '</span>'
        } else {
            return _.escape(m)
        }
    })
}

export default brush

export {
    log,
    browserify,
}
