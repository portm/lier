export interface Style {
    key: {
        identifier: string
        regex: string
        string: string
        number: string
        $: string,
    }
    identifier: string
    regex: string
    string: string
    number: string
    match: string
    enum: string
    case: string
    ':': string
    '?': string
    operator: string
    '@': string
    decorate: string
    groupStart: string
    groupEnd: string
    arrayStart: string
    arrayEnd: string
    blockStart: string
    blockEnd: string
    comment: string
    error: string
    memberStart: string
    memberEnd: string
    ',': string
    '.': string
    '...': string
    this: string
    self: string
    path: string
    blank: string
    type: string
    typePath: string
}

export interface Stream {
    match: (regex: RegExp) => any
    eol: () => boolean
    peek: () => string
    next: () => void
    skipToEnd: () => void
    string: string
    pos: number
}
