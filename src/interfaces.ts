import inspect from './inspect'

declare let Set, Map

export interface Options {
    banExtra: boolean
}

export type Path = string[]

export class LierError {
    path: Path
    message: string[]

    constructor (path: Path, message: string[]) {
        this.path = path
        this.message = message
    }

    inspect (opts, depth) {
        const obj = {
            path: this.path.join('.'),
            message: {
                inspect: (opts, depth) => {
                    return this.message.map(
                        e => typeof e === 'string' ? e : inspect(e, opts, depth),
                    ).join(' ')
                },
            },
        }

        Object.defineProperty(obj, 'constructor', {
            value: function TypeError () {},
        })

        return inspect(obj, opts, depth)
    }

    toString () {
        return inspect(this)
    }
}

export type Nodes = any

export interface RootOptions {
    data: any
    type: any
    nodes: Nodes
    isMock: boolean
    declares: Nodes
}

export class Root {
    data: any
    type: any
    nodes: Nodes
    isMock: boolean
    declares: Nodes
    errors: LierError[]

    constructor (options: RootOptions) {
        this.data = options.data
        this.type = options.type
        this.nodes = options.nodes
        this.isMock = options.isMock
        this.declares = options.declares
        this.errors = []
    }
}

export interface Context {
    data: any
    path: Path
    root: Root
    validate: (data, type, path?: Path, root?: Root) => void
    mock: (type, cycled?: boolean, path?: Path, root?: Root) => any
}

export interface Type {
    description?: string
    keyMock?: string
    (ctx: Context): any
}

export const controlKeys = {
    rest: '$rest',
}
