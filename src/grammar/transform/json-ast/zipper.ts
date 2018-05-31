import * as lier from '../../interface'
import utils from '../../utils'
import * as _ from 'lodash'

const Type = lier.Type

interface Context {
    type: any
    rate: number
}

interface Zipper {
    start: (node: any, context: Context) => any
    router: (node: any, context: Context) => any
    [operator: number]: (node: any, context: Context) => any
}

const zipper: Zipper = {
    start: (node, context) => {
        const ret = []
        for (const item of node) {
            if (item.type === Type.element) {
                const merge = zipper.router(item, {
                    type: null,
                    rate: context.rate,
                })
                if (merge) {
                    ret.push(merge)
                } else {
                    ret.push(item)
                }
            } else {
                ret.push(item)
            }
        }
        return ret
    },
    router: (node, context) => {
        if (!node) {
            return null
        }
        const handler = zipper[node.type]
        if (!handler) {
            return null
        }
        // merge a | b, b => a | b
        if (context.type && context.type.type === Type.binary && node.type !== Type.binary) {
            return zipper.router(context.type, {
                type: node,
                rate: context.rate,
            })
        }
        return handler(node, context)
    },
    [Type.unary]: (node, context) => {
        if (!context.type) {
            const merge = zipper.router(node.argument, {
                type: null,
                rate: context.rate,
            })
            if (merge) {
                return {
                    type: Type.unary,
                    operator: node.operator,
                    argument: merge,
                } as lier.UnaryNode
            }
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
            rate: context.rate,
        })
        if (!argument) {
            return
        }
        return {
            type: Type.unary,
            operator: node.operator,
            argument,
        } as lier.UnaryNode
    },
    [Type.member]: (node, context) => {
        if (!context.type) {
            return
        }
        if (node.type !== context.type.type) {
            return
        }
        return node
    },
    [Type.binary]: (node, context) => {
        let leftMembers = utils.spreadMember(node, node.operator)
        let ret = false
        for (let i = 0; i < leftMembers.length; ++ i) {
            const item = leftMembers[i]
            const merge = zipper.router(item, {
                type: null,
                rate: context.rate,
            })
            if (merge) {
                ret = true
                leftMembers[i] = merge
            }
        }
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
                        rate: context.rate,
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
        let reduces = leftMembers.filter(i => !!i)
        if (reduces.length < leftMembers.length) {
            ret = true
        }
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
                        rate: context.rate,
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
            ret = flag
            if (flag) {
                reduces = rightReduces
            }
        }
        if (!ret) {
            return
        }
        if (reduces.length === 1) {
            return reduces[0]
        } else if (reduces.length > 1) {
            return reduces.reduce((left, right) => {
                return {
                    type: Type.binary,
                    operator: '|',
                    left,
                    right,
                } as lier.BinaryNode
            })
        }
    },
    [Type.object]: (node, context) => {
        let merged = {}
        let flag = false
        for (const prop of node.properties) {
            if (prop.type === Type.comment) {
                continue
            }
            const merge = zipper.router(prop.value, {
                type: null,
                rate: context.rate,
            })
            if (merge) {
                flag = true
                merged[prop.key.value] = {
                    type: Type.property,
                    decorators: prop.decorators,
                    optional: prop.optional,
                    key: prop.key,
                    value: merge,
                } as lier.PropertyNode
            } else {
                merged[prop.key.value] = prop
            }
        }
        const mergeKeyNode = mergeNumberKeys(merged, context)
        if (mergeKeyNode) {
            flag = true
            node = mergeKeyNode
        } else if (flag) {
            node = {
                type: Type.object,
                properties: _.values(merged)
            }
        }
        if (!context.type) {
            if (flag) {
                return node
            }
            return
        }
        if (node.type !== context.type.type) {
            return
        }
        merged = {}
        const left = {}
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
                type: prop.value,
                rate: context.rate,
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
            } as lier.PropertyNode
        }
        const leftKeys = Object.keys(left)
        const rightKeys = Object.keys(right)
        let mergeKeys = Object.keys(merged)
        // >= 50% merge
        if (mergeKeys.length / Math.max(leftKeys.length, rightKeys.length) < context.rate) {
            return
        }
        const diffLeftKeys = _.difference(leftKeys, mergeKeys)
        for (const key of diffLeftKeys) {
            const leftItem = left[key]
            const rightItem = right[key]
            if (!rightItem) {
                merged[key] = {
                    type: Type.property,
                    decorators: leftItem.decorators,
                    optional: true,
                    key: leftItem.key,
                    value: leftItem.value,
                } as lier.PropertyNode
                continue
            }
            if (leftItem.value.type === Type.identifier && rightItem.value.type === Type.identifier) {
                merged[key] = {
                    type: Type.property,
                    decorators: leftItem.decorators,
                    optional: leftItem.optional || rightItem.optional,
                    key: leftItem.key,
                    value: {
                        type: Type.binary,
                        operator: '|',
                        left: leftItem.value,
                        right: rightItem.value,
                    } as lier.BinaryNode,
                } as lier.PropertyNode
                continue
            }
            return
        }
        mergeKeys = Object.keys(merged)
        const diffRightKeys = _.difference(rightKeys, mergeKeys)
        for (const key of diffRightKeys) {
            const leftItem = right[key]
            const rightItem = left[key]
            if (!left[key]) {
                merged[key] = {
                    type: Type.property,
                    decorators: leftItem.decorators,
                    optional: true,
                    key: leftItem.key,
                    value: leftItem.value,
                } as lier.PropertyNode
                continue
            }
            if (leftItem.value.type === Type.identifier && rightItem.value.type === Type.identifier) {
                merged[key] = {
                    type: Type.property,
                    decorators: leftItem.decorators,
                    optional: leftItem.optional || rightItem.optional,
                    key: leftItem.key,
                    value: {
                        type: Type.binary,
                        operator: '|',
                        left: leftItem.value,
                        right: rightItem.value,
                    } as lier.BinaryNode,
                } as lier.PropertyNode
                continue
            }
            return
        }
        return {
            type: Type.object,
            properties: _.values(merged),
        } as lier.ObjectNode
    },
    [Type.enum]: (node, context) => {
        if (!context.type) {
            return
        }
        if (node.type !== context.type.type) {
            return
        }
        return node
    },
    [Type.match]: (node, context) => {
        if (!context.type) {
            return
        }
        if (node.type !== context.type.type) {
            return
        }
        return node
    },
    [Type.case]: (node, context) => {
        if (!context.type) {
            return
        }
        if (node.type !== context.type.type) {
            return
        }
        return node
    },
    [Type.call]: (node, context) => {
        if (!context.type) {
            return
        }
        if (node.type !== context.type.type) {
            return
        }
        return node
    },
    [Type.array]: (node, context) => {
        if (!context.type) {
            const merge = zipper.router(node.value, {
                type: null,
                rate: context.rate,
            })
            if (merge) {
                return {
                    type: Type.array,
                    value: merge,
                } as lier.ArrayNode
            }
            return
        }
        if (node.type !== context.type.type) {
            return
        }
        const merge = zipper.router(node.value, {
            type: context.type.value,
            rate: context.rate,
        })
        if (merge) {
            return {
                type: Type.array,
                value: merge,
            } as lier.ArrayNode
        }
    },
    [Type.tuple]: (node, context) => {
        let ret = false
        const tuples = []
        for (const item of node.value) {
            if (item.type === Type.comment) {
                continue
            }
            const merge = zipper.router(item, {
                type: null,
                rate: context.rate,
            })
            if (merge) {
                ret = true
                tuples.push(merge)
            } else {
                tuples.push(item)
            }
        }
        if (!context.type) {
            return
        }
        if (node.type !== context.type.type) {
            return
        }
        if (context.type.value.length === node.value.length) {
            let flag = true
            for (let i = 0; i < node.value.length; ++ i) {
                const left = node.value[i]
                const right = context.type.value[i]
                const merge = zipper.router(left, {
                    type: right,
                    rate: context.rate,
                })
                if (merge) {
                    tuples[i] = merge
                } else {
                    flag = false
                }
            }
            ret = flag
        }
        if (ret) {
            return {
                type: Type.tuple,
                value: tuples,
            } as lier.TupleNode
        }
    },
    [Type.rest]: (node, context) => {
        if (!context.type) {
            const merge = zipper.router(node.value, {
                type: null,
                rate: context.rate,
            })
            if (merge) {
                return {
                    type: Type.optional,
                    value: merge,
                }
            }
            return
        }
        if (node.type !== context.type.type) {
            return
        }
        const merge = zipper.router(node.value, {
            type: context.type.value,
            rate: context.rate,
        })
        if (merge) {
            return {
                type: Type.optional,
                value: merge,
            }
        }
    },
    [Type.optional]: (node, context) => {
        if (!context.type) {
            const merge = zipper.router(node.value, {
                type: null,
                rate: context.rate,
            })
            if (merge) {
                return {
                    type: Type.optional,
                    value: merge,
                }
            }
            return
        }
        if (node.type !== context.type.type) {
            return
        }
        const merge = zipper.router(node.value, {
            type: context.type.value,
            rate: context.rate,
        })
        if (merge) {
            return {
                type: Type.optional,
                value: merge,
            }
        }
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
        const merge = zipper.router(node.assignment, {
            type: null,
            rate: context.rate,
        })
        if (merge) {
            return {
                type: Type.element,
                declarations: node.declarations,
                assignment: merge,
            } as lier.ElementNode
        }
    },
}

// merge only number keys
const mergeNumberKeys = (merged, context) => {
    const mergeKeys = Object.keys(merged)
    let mergeNumberKeys = true
    for (const key of mergeKeys) {
        if (!/^\d+$/.test(key)) {
            mergeNumberKeys = false
        }
    }
    if (!mergeNumberKeys) {
        return
    }
    const numberMerged = {}
    let first = null
    for (const key of mergeKeys) {
        const item = merged[key]
        if (first) {
            const merge = zipper.router(first.value, {
                type: item.value,
                rate: context.rate,
            })
            if (!merge) {
                return
            }
            first.value = merge
        } else {
            first = {
                type: Type.property,
                optional: item.optional,
                decorators: item.decorators,
                key: {
                    type: Type.regular,
                    value: /^\d+$/,
                },
                value: item.value,
            }
        }
    }
    if (first) {
        return {
            type: Type.object,
            properties: [first],
        }
    }
}

export default (node: lier.Node[], rate: number = 0.5): any => {
    const context: Context = {
        type: null,
        rate,
    }
    return zipper.start(node, context)
}
