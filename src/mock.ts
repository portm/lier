import { Path, Root, Type, controlKeys } from './interfaces'
import _ from './utils'
import validate from './validate'

declare let Map

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
            } else if (k === controlKeys.definitions) {
                // we don't have to handle definitions
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

function mock (type, data = this.data, path: Path = this.path, root: Root = this.root): any {
    return walk(type, data, path, root)
}

function walk (type, data, path: Path, root: Root) {
    const key = getKey(path)

    if (_.isRegExp(type)) {
        data[key] = _.randExp(type)
    } else if (_.isFunction(type)) {
        data[key] = type({ data, path, root, mock })
    } else if (_.isObjectLike(type)) {
        const isArray = type instanceof Array
        const node = isArray ? [] : {}

        const nodes = root.nodes

        if (nodes.has(type)) {
            // when cycle is detected
            data[key] = nodes.get(type)
        } else if (type.hasOwnProperty(controlKeys.export)) {
            const exportType = type[controlKeys.export]
            const value = walk(exportType, data, path.concat(controlKeys.export), root)
            data[key] = value
        } else {
            data[key] = node

            nodes.set(type, node)

            if (isArray)
                mockArray(type, node, path, root)
            else if (type.constructor === Object)
                mockObject(type, node, path, root)
            else
                data[key] = type
        }
    } else {
        data[key] = type
    }

    return data[key]
}

export default (type) => {
    const root = new Root({}, type, true, new Map)
    const data = walk(type, root, [], root)
    const errs = validate(data, type)
    if (errs)
        throw new TypeError(JSON.stringify(errs, null, 4))
    else
        return data
}
