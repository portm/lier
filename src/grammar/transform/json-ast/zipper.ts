import * as lier from '../../interface'
import utils from '../../utils'
import * as _ from 'lodash'

const Type = lier.Type

interface Context {
    type: any
}

interface Zipper {
    start: (node: any, context: Context) => any
    router: (node: any, context: Context) => any
    [operator: number]: (node: any, context: Context) => any
}

const zipper: Zipper = {
    start: (node, context) => {
        for (const item of node) {
            if (item.type === Type.element) {
                zipper.router(item, context)
            }
        }
    },
    router: (node, context) => {
        if (!node) {
            return null
        }
        const handler = zipper[node.type]
        if (!handler) {
            return null
        }
        return handler(node, context)
    },
    [Type.unary]: (node, context) => {
        if (!context.type) {
            zipper.router(node.argument, {
                type: null,
            })
            return
        }
        if (node.type !== context.type.type) {
            return
        }
        if (node.operator !== context.type.operator) {
            return
        }
        const argument = zipper.router(node.argument, {
            type: context.type.argument,
        })
        if (!argument) {
            return
        }
        return {
            type: Type.unary,
            operator: node.operator,
            argument,
        }
    },
    [Type.member]: (node, context) => {
        return node
    },
    [Type.binary]: (node, context) => {
        const leftMembers = utils.spreadMember(node, node.operator)
        // zip last node
        zipper.router(leftMembers[leftMembers.length - 1], {
            type: null,
        })
        let deep = true
        while (deep) {
            // deep zip: { a, b } { a } { b, c } => { a, b, c }
            deep = false
            // zip len - 1 .. 0
            for (let i = leftMembers.length - 1; i >= 0; -- i) {
                const curr = leftMembers[i]
                for (let n = i + 1; n < leftMembers.length; ++ n) {
                    const prev = leftMembers[n]
                    if (!prev) {
                        continue
                    }
                    const merge = zipper.router(curr, {
                        type: prev,
                    })
                    if (merge) {
                        deep = true
                        leftMembers[n] = merge
                        leftMembers[i] = null
                        break
                    }
                }
            }
        }
        const reduces = leftMembers.filter(i => !!i)
        let flag = context.type
        if (flag) {
            const rightReduces = reduces.slice()
            const rightMembers = utils.spreadMember(context.type, context.type.operator)
            // zip right to left
            for (const prev of rightMembers) {
                let itemFlag = false
                for (let i = 0; i < rightReduces.length; ++ i) {
                    const curr = rightReduces[i]
                    const merge = zipper.router(curr, {
                        type: prev,
                    })
                    if (merge) {
                        rightReduces[i] = merge
                        itemFlag = true
                        break
                    }
                }
                if (!itemFlag) {
                    flag = false
                }
            }
            if (flag) {
                if (rightReduces.length === 1) {
                    return rightReduces[0]
                } else if (rightReduces.length > 1) {
                    return rightReduces.reduce((left, right) => {
                        return {
                            type: Type.binary,
                            operator: '|',
                            left,
                            right,
                        }
                    })
                }
                return
            }
        }
        // replace node
        if (reduces.length === 1) {
            for (const key of Object.keys(node)) {
                delete node[key]
            }
            _.assign(node, reduces[0])
        } else if (reduces.length > 1) {
            const reduce: any = reduces.reduce((left, right) => {
                return {
                    type: Type.binary,
                    operator: '|',
                    left,
                    right,
                }
            })
            node.left = reduce.left
            node.right = reduce.right
        }
    },
    [Type.object]: (node, context) => {
        if (!context.type) {
            for (const prop of node.properties) {
                zipper.router(prop.value, {
                    type: null,
                })
            }
            return
        }
        if (node.type !== context.type.type) {
            return
        }
        const left = {}
        const merged = {}
        const right = {}
        for (const prop of node.properties) {
            if (prop.type === Type.comment) {
                continue
            }
            left[prop.key.value] = prop
        }
        for (const prop of context.type.properties) {
            if (prop.type === Type.comment) {
                continue
            }
            const key = prop.key.value
            right[key] = prop
            const item = left[key]
            if (!item) {
                continue
            }
            const merge = zipper.router(item.value, {
                type: prop.value
            })
            if (!merge) {
                continue
            }
            merged[key] = {
                type: Type.property,
                decorators: item.decorators,
                optional: prop.optional || item.optional,
                key: item.key,
                value: merge,
            }
        }
        const leftKeys = Object.keys(left)
        const rightKeys = Object.keys(right)
        const mergeKeys = Object.keys(merged)
        // >= 50% merge
        if (mergeKeys.length / Math.max(leftKeys.length, rightKeys.length) < .5) {
            return
        }
        const diffLeftKeys = _.difference(leftKeys, mergeKeys)
        const diffRightKeys = _.difference(rightKeys, mergeKeys)
        for (const key of diffLeftKeys) {
            const item = left[key]
            if (!right[key]) {
                merged[key] = {
                    type: Type.property,
                    decorators: item.decorators,
                    optional: true,
                    key: item.key,
                    value: item.value,
                }
                continue
            }
            return
        }
        for (const key of diffRightKeys) {
            const item = right[key]
            if (!left[key]) {
                merged[key] = {
                    type: Type.property,
                    decorators: item.decorators,
                    optional: true,
                    key: item.key,
                    value: item.value,
                }
                continue
            }
            return
        }
        return {
            type: Type.object,
            properties: _.values(merged),
        }
    },
    [Type.enum]: (node, context) => {
    },
    [Type.match]: (node, context) => {
    },
    [Type.case]: (node, context) => {
    },
    [Type.call]: (node, context) => {
    },
    [Type.array]: (node, context) => {
        if (!context.type) {
            zipper.router(node.value, {
                type: null,
            })
            return
        }
        if (node.type !== context.type.type) {
            return
        }
        const value = zipper.router(node.value, {
            type: context.type.value,
        })
        if (!value) {
            return
        }
        return {
            type: Type.array,
            value,
        }
    },
    [Type.tuple]: (node, context) => {
    },
    [Type.rest]: (node, context) => {
    },
    [Type.optional]: (node, context) => {
    },
    [Type.identifier]: (node, context) => {
        if (!context.type) {
            return
        }
        if (node.type !== context.type.type) {
            return
        }
        if (node.value !== context.type.value) {
            return
        }
        return node
    },
    [Type.element]: (node, context) => {
        zipper.router(node.assignment, {
            type: null,
        })
    },
}

export default (node: lier.Node[]): void => {
    const context: Context = {
        type: null
    }
    zipper.start(node, context)
}
