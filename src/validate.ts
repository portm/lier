/**
 * Lier in french means bond, link.
 */

import { controlKeys, LierError, Path, Root } from './interfaces'
import _ from './utils'

declare let Set

function validate (data, type, path: Path = this.path, root: Root = this.root) {
    walk(data, type, path, root)
}

function validateRegex (data, type, path: Path, root: Root) {
    if (_.isRegExp(data)) {
        if (data.toString() !== type.toString())
            root.errors.push(new LierError(path, [data, `is not`, type]))
        return
    }

    if (!_.isString(data) && !_.isNumber(data) || !type.test(data as string)) {
        root.errors.push(new LierError(path, [data, `doesn't match regex`, type]))
    }
}

function validateExplicitValue (data, type, path: Path, root: Root) {
    if (!_.isEqual(data, type)) {
        root.errors.push(new LierError(path, [data, `is not`, type]))
    }
}

function validateArray (data, type, path: Path, root: Root) {
    if (_.isArray(data)) {
        if (type.length > 1) throw new TypeError('array type contains multiple types')
        if (type.length === 1) {
            for (let i = 0; i < data.length; i++) {
                walk(data[i], type[0], path.concat(i + ''), root)
            }
        }
    } else {
        root.errors.push(new LierError(path, [data, 'is not', type]))
    }
}

function validateObject (data, type, path: Path, root: Root) {
    if (type.hasOwnProperty(controlKeys.export)) {
        walk(data, type[controlKeys.export], path.concat(controlKeys.export), root)
    } else if (_.isObjectLike(data)) {
        const matchedKeys = new Set
        let restType

        for (let k in type) {
            const currType = type[k]
            if (_.isControlKey(k)) {
                if (k === controlKeys.rest) {
                    restType = currType
                } else if (k === controlKeys.definitions) {
                    // we don't have to handle definitions
                } else {
                    throw new TypeError('unknown control key')
                }
            } else if (_.isPatternKey(k)) {
                const ms = _.matchKeyPattern(k)

                if (!ms) throw new TypeError('pattern key is not a valid RegExp')

                // TODO: we can cache the regex to improve the performance
                const keyPattern = new RegExp(ms[1], ms[2])
                for (const dataKey in data) {
                    if (keyPattern.test(dataKey)) {
                        matchedKeys.add(dataKey)
                        walk(data[dataKey], currType, path.concat(dataKey), root)
                    }
                }
            } else {
                k = _.unescapeControlKey(k)
                matchedKeys.add(k)
                walk(data[k], currType, path.concat(k), root)
            }
        }

        if (restType) {
            for (const key in data) {
                if (matchedKeys.has(key)) continue
                walk(data[key], restType, path.concat(key), root)
            }
        }
    } else {
        root.errors.push(new LierError(path, [data, 'is not', type]))
    }
}

function walk (data, type, path: Path, root: Root) {
    if (_.isRegExp(type)) {
        validateRegex(data, type, path, root)
    } else if (_.isFunction(type)) {
        const message = type({ data, path, root, validate })
        if (message) {
            root.errors.push(new LierError(path, message))
        }
    } else if (_.isObjectLike(type)) {
        if (root.nodes.has(data) && root.nodes.has(type))
            return

        const store = root.nodes
        root.nodes = new Set(root.nodes)
        root.nodes.add(type)
        root.nodes.add(data)

        if (type instanceof Array) {
            validateArray(data, type, path, root)
        } else if (type.constructor === Object) {
            validateObject(data, type, path, root)
        } else {
            validateExplicitValue(data, type, path, root)
        }
        root.nodes = store
    } else if (_.isUndefined(type)) {
        // to prevent miss type of type name
        throw new TypeError('type must not be void')
    } else {
        validateExplicitValue(data, type, path, root)
    }
}

export default function (data, type): LierError[] | void {
    const root = new Root(data, type)

    walk(data, type, [], root)

    if (root.errors.length) return root.errors
}
