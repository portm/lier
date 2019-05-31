import { Context, Path, Root, Type, controlKeys, MockNodes } from './interfaces'
import _ from './utils'
import validate from './validate'

declare let Map

const MAX_CYCLE_LIMIT = 1e5

function getKey (path: Path) {
    return path.length === 0 ? 'data' : path[path.length - 1]
}

function mockArray (type, data, path: Path, root: Root) {
    if (type.length > 1) throw new TypeError('array type contains multiple types')
    if (type.length === 1) {
        for (let i = 0; i < _.random(1, 10); i++) {
            walk(type[0], data, path.concat(i + ''), root)
        }
    }
}

function mockObject (type, data, path: Path, root: Root) {
    for (const k in type) {
        if (!type.hasOwnProperty(k)) {
            continue
        }

        const currType: Type = type[k]
        if (_.isControlKey(k)) {
            if (k === controlKeys.rest) {
                if (currType.hasOwnProperty('keyMock'))
                    walk(currType, data, path.concat(currType.keyMock), root)
                else
                    throw new TypeError('$rest should mock with keyMock')
            } else {
                throw new TypeError('unknown control key')
            }
        } else if (_.isPatternKey(k)) {
            const ms = _.matchKeyPattern(k)

            if (!ms) throw new TypeError('pattern key is not a valid RegExp')

            // TODO: we can cache the regex to improve the performance
            if (_.isString(currType.keyMock))
                walk(currType, data, path.concat(currType.keyMock), root)
            else
                walk(currType, data, path.concat(_.randExp(ms[1], ms[2])), root)
        } else {
            walk(currType, data, path.concat(_.unescapeControlKey(k)), root)
        }
    }
}

function mock (this: Context, type, data = this.data, path: Path = this.path, root: Root = this.root): any {
    return walk(type, data, path, root)
}

function select (this: Context, types: any[]): any {
    if (this.root.cycleDeep === 0) {
        return types[_.random(0, types.length - 1)]
    }
    const counter = this.root.nodes.counter
    const newTypes = []
    for (const type of types) {
        if (!counter.has(type)) {
            counter.set(type, this.root.cycleDeep - 1)
        }
        const quota = counter.get(type)
        if (quota > 0) {
            newTypes.push(type)
            counter.set(type, quota - 1)
        }
    }
    return newTypes[_.random(0, newTypes.length - 1)]
}

function walk (type, data, path: Path, root: Root) {
    const key = getKey(path)

    const nodes = root.nodes

    root.nodes = {
        range: nodes.range,
        marker: new Map(nodes.marker),
        counter: new Map(nodes.counter),
    }

    if (_.isRegExp(type)) {
        data[key] = _.randExp(type)
    } else if (_.isFunction(type)) {
        data[key] = type({ data, path, root, mock, select })
    } else if (_.isObjectLike(type)) {
        const isArray = type instanceof Array
        const node = isArray ? [] : {}

        if (nodes.marker.has(type)) {
            // when cycle is detected
            const ref = nodes.marker.get(type)
            if (root.cycleDeep === 0) {
                root.nodes = nodes
                return data[key] = ref.node
            } else if (ref.num > 0) {
                ref.num --
            } else {
                throw new TypeError('cycle is detected')
            }
        } else {
            root.nodes.marker.set(type, {
                node,
                num: MAX_CYCLE_LIMIT,
            })
        }

        data[key] = node

        if (isArray)
            mockArray(type, node, path, root)
        else if (type.constructor === Object)
            mockObject(type, node, path, root)
        else
            data[key] = type

    } else {
        data[key] = type
    }

    root.nodes = nodes

    return data[key]
}

export default (type, declares = {}, cycleDeep = 2) => {
    const root = new Root({
        data: {},
        type,
        isMock: true,
        nodes: {
            range: null,
            marker: new Map(),
            counter: new Map(),
        } as MockNodes,
        declares,
        cycleDeep,
    })
    const data = walk(type, root, [], root)
    const errs = validate(data, type, declares)
    if (errs)
        throw new TypeError(JSON.stringify(errs, null, 4))
    else
        return data
}
