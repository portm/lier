import { Style } from '../tokenizer/interface.d'

export interface FormatStyle extends Style {
    description: string
    mock: string
    wrapup: string
    matchTest: string
}

const style: FormatStyle = {
    key: {
        identifier: 'key-identifier',
        regex: 'key-regex',
        string: 'key-string',
        number: 'key-number',
        $: 'key-dollar',
    },
    identifier: 'identifier',
    regex: 'regex',
    string: 'string',
    number: 'number',
    match: 'match',
    enum: 'enum',
    case: 'case',
    ':': 'colon',
    '?': 'optional',
    operator: 'operator',
    '@': 'at',
    decorate: 'decorate',
    groupStart: 'group-start',
    groupEnd: 'group-end',
    arrayStart: 'array-start',
    arrayEnd: 'array-end',
    blockStart: 'block-start',
    blockEnd: 'block-end',
    comment: 'comment',
    error: 'error',
    memberStart: 'array-start',
    memberEnd: 'array-end',
    matchTest: 'match-test',
    ',': 'comma',
    '.': 'dot',
    this: 'this',
    self: 'self',
    path: 'path',
    blank: 'blank',
    description: 'description',
    mock: 'mock',
    wrapup: 'wrapup',
    '...': 'spread',
    type: 'type',
    typePath: 'typePath',
    '=': 'equal',
}

export default style
