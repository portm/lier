import * as lier from '../../interface'
import utils from './utils'

const Type = lier.Type

interface Context {
    prev: any
}

interface Decorator {
    router: (node: any, context: Context) => void
    equal: (node: any, context: Context) => boolean
    [operator: number]: (node: any, context: Context) => void
}

const decorator: Decorator = {
    router: (node, context) => {
        if (!node || !context.prev) {
            return
        }
        node = utils.value(node)
        let prev = utils.value(context.prev)
        if (utils.type(node) === 'Array') {
            if (utils.type(prev) !== 'Array') {
                decorator.router(node[0], {
                    prev,
                })
            } else {
                for (let i = 0; i < node.length; ++ i) {
                    decorator.router(node[i], {
                        prev: prev[i],
                    })
                }
            }
            return
        }
        if (utils.type(prev) === 'Array') {
            decorator.router(node, {
                prev: prev[0],
            })
            return
        }
        const handler = decorator[node.type]
        if (!handler) {
            return
        }
        handler(node, {
            prev,
        })
    },
    equal: (node, context) => {
        return context.prev && context.prev.type === node.type
    },
    [Type.unary]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        decorator.router(node.argument, {
            prev: utils.value(context.prev.argument),
        })
    },
    [Type.member]: (node, context) => {
        if (!context.prev) {
            return
        }
        if (context.prev.type !== node.type) {
            context.prev = {
                type: Type.array,
                value: context.prev,
            } as lier.ArrayNode
        }
        decorator.router(node.properties, {
            prev: context.prev.properties,
        })
        decorator.router(node.object, {
            prev: context.prev.object,
        })
    },
    [Type.binary]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        decorator.router(node.left, {
            prev: context.prev.left,
        })
        decorator.router(node.right, {
            prev: context.prev.right,
        })
    },
    [Type.object]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        const prevMap = {}
        for (const property of context.prev.properties) {
            const key = utils.value(property.key)
            if (!key) {
                continue
            }
            prevMap[key.value] = property
        }
        for (const property of node.properties) {
            const key = utils.value(property.key)
            if (!key) {
                continue
            }
            if (!prevMap[key.value]) {
                continue
            }
            decorator.router(property, {
                prev: prevMap[key.value],
            })
        }
    },
    [Type.property]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        const prev = context.prev
        if (prev.decorators.length) {
            node.decorators = prev.decorators
        }
        if (prev.optional) {
            node.optional = true
        }
        decorator.router(node.value, {
            prev: context.prev.value,
        })
    },
    [Type.enum]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        decorator.router(node.arguments, {
            prev: context.prev.arguments,
        })
    },
    [Type.match]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        decorator.router(node.test, {
            prev: context.prev.test,
        })
        for (let i = 0; i < node.cases.length; ++ i) {
            const { test, value } = node.cases[i]
            const prevCase = context.prev.cases[i]
            if (!prevCase) {
                break
            }
            decorator.router(test, {
                prev: prevCase.test,
            })
            decorator.router(value, {
                prev: prevCase.value,
            })
        }
    },
    [Type.call]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        decorator.router(node.callee, {
            prev: context.prev.callee,
        })
        decorator.router(node.arguments, {
            prev: context.prev.arguments,
        })
    },
    [Type.array]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        decorator.router(node.value, {
            prev: context.prev.value,
        })
    },
    [Type.tuple]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        decorator.router(node.value, {
            prev: context.prev.value,
        })
    },
    [Type.rest]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        decorator.router(node.value, {
            prev: context.prev.value,
        })
    },
    [Type.optional]: (node, context) => {
        if (!decorator.equal(node, context)) {
            return
        }
        decorator.router(node.value, {
            prev: context.prev.value,
        })
    }
}

export default (ast: lier.Node, prev: lier.Node): void => {
    decorator.router(ast, {
        prev,
    })
}
