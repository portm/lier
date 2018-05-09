import * as lier from '../../interface'
import utils from './utils'

const Type = lier.Type

interface Context {
    type: any
}

interface Decorator {
    router: (node: any, context: Context) => void
    equal: (node: any, context: Context) => boolean
    pairing: (left: any, right: any, attr: string) => void
    [operator: number]: (node: any, context: Context) => void
}

const decorator: Decorator = {
    router: (node, context) => {
        const type = context.type
        if (!node || !type) {
            return
        }
        const handler = decorator[node.type]
        if (!handler) {
            return
        }
        handler(node, {
            type,
        })
    },
    equal: (node, context) => {
        return context.type && context.type.type === node.type
    },
    pairing: (left, right, attr) => {
        const oldValue = right[attr].slice()
        const newValue = left[attr]
        const ret = []
        while (oldValue.length && newValue.length) {
            const comments = []
            let oldTop
            let newTop
            while (oldValue.length) {
                oldTop = oldValue.shift()
                if (oldTop.type === Type.comment) {
                    comments.push(oldValue)
                } else {
                    break
                }
            }
            while (newValue.length) {
                newTop = newValue.shift()
                ret.push(newTop)
                if (newTop.type === Type.comment) {
                    comments.length = 0
                } else {
                    break
                }
            }
            if (!newTop || !oldTop) {
                break
            }

            ret.splice(Math.max(ret.length - 1, 0), 0, ...comments)
            decorator.router(newTop, {
                type: oldTop,
            })
        }
        left[attr] = ret
    },
    [Type.unary]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        decorator.router(node.argument, {
            type: context.type.argument,
        })
    },
    [Type.member]: (node, context) => {
        if (!context.type) {
            return
        }
        if (context.type.type !== node.type) {
            context.type = {
                type: Type.array,
                value: context.type,
            } as lier.ArrayNode
        }
        decorator.router(node.properties, {
            type: context.type.properties,
        })
        decorator.router(node.object, {
            type: context.type.object,
        })
    },
    [Type.binary]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        decorator.router(node.left, {
            type: context.type.left,
        })
        decorator.router(node.right, {
            type: context.type.right,
        })
    },
    [Type.object]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        const prevMap = {}
        let comments = []
        let last = null
        for (const property of context.type.properties) {
            if (property.type === Type.comment) {
                comments.push(property)
                continue
            }
            const key = property.key.value
            last = prevMap[key] = {
                property,
                comments,
            }
            comments = []
        }
        if (comments.length && last) {
            last.comments = last.comments.concat(comments)
        }
        const newProperties = []
        let flag = true
        while (node.properties.length) {
            const property = node.properties.shift()
            newProperties.push(property)
            if (property.type === Type.comment) {
                flag = false
                continue
            }
            const key = property.key.value
            const prev = prevMap[key]
            if (!prev) {
                flag = true
                continue
            }
            if (flag) {
                newProperties.splice(Math.max(newProperties.length - 1, 0), 0, ...prev.comments)
            }
            decorator.router(property, {
                type: prev.property,
            })
            flag = true
        }
        node.properties = newProperties
    },
    [Type.property]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        const prev = context.type
        if (prev.decorators.length) {
            node.decorators = prev.decorators
        }
        if (prev.optional) {
            node.optional = true
        }
        decorator.router(node.value, {
            type: context.type.value,
        })
    },
    [Type.enum]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        const prevMap = {}
        let comments = []
        let last = null
        for (const arg of context.type.arguments) {
            if (arg.type === Type.comment) {
                comments.push(arg)
                continue
            }
            const key = arg.name
            last = prevMap[key] = {
                arg,
                comments,
            }
            comments = []
        }
        if (comments.length && last) {
            last.comments = last.comments.concat(comments)
        }
        const newArgs = []
        let flag = true
        while (node.arguments.length) {
            const arg = node.arguments.shift()
            newArgs.push(arg)
            if (arg.type === Type.comment) {
                flag = false
                continue
            }
            const key = arg.name
            const prev = prevMap[key]
            if (!prev) {
                flag = true
                continue
            }
            if (flag) {
                newArgs.splice(Math.max(newArgs.length - 1, 0), 0, ...prev.comments)
            }
            flag = true
        }
        node.arguments = newArgs
    },
    [Type.match]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        decorator.router(node.test, {
            type: context.type.test,
        })
        decorator.pairing(node, context.type, 'cases')
    },
    [Type.case]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        const { test, value } = node
        const prevCase = context.type

        decorator.router(test, {
            type: prevCase.test,
        })
        decorator.router(value, {
            type: prevCase.value,
        })
    },
    [Type.call]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        decorator.router(node.callee, {
            type: context.type.callee,
        })
        for (let i = 0; i < node.arguments.length; ++ i) {
            if (!context.type.arguments[i]) {
                break
            }
            decorator.router(node.arguments[i], {
                type: context.type.arguments[i],
            })
        }
    },
    [Type.array]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        decorator.router(node.value, {
            type: context.type.value,
        })
    },
    [Type.tuple]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        decorator.pairing(node, context.type, 'value')
    },
    [Type.rest]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        decorator.router(node.value, {
            type: context.type.value,
        })
    },
    [Type.optional]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        decorator.router(node.value, {
            type: context.type.value,
        })
    },
    [Type.element]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        decorator.pairing(node, context.type, 'declarations')
        decorator.router(node.assignment, {
            type: context.type.assignment,
        })
    },
}

export default (newType: lier.Node[], oldType: lier.Node[]): void => {
    let element
    const comments = []
    for (const item of oldType) {
        if (item.type === Type.element) {
            element = item
        } else {
            comments.push(item)
        }
    }
    if (!element) {
        return
    }
    if (newType[0].type === Type.element && comments.length) {
        newType.splice(0, 0, ...comments)
    }
    for (const item of newType) {
        if (item.type !== Type.element) {
            continue
        }
        decorator.router(item, {
            type: element,
        })
    }
}
