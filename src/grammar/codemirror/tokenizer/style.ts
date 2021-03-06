import { Style } from '../../tokenizer/interface.d'

const style: Style = {
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
    groupStart: 'group',
    groupEnd: 'group',
    arrayStart: 'array',
    arrayEnd: 'array',
    blockStart: 'block',
    blockEnd: 'block',
    comment: 'comment',
    error: 'error',
    memberStart: 'array',
    memberEnd: 'array',
    ',': 'comma',
    '.': 'dot',
    this: 'this',
    self: 'self',
    path: 'path',
    blank: 'comment',
    '...': 'spread',
    typePath: 'typePath',
    type: 'type',
    '=': 'equal',
}

export default style
