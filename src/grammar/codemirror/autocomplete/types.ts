import { types } from '../../../../index'
import decorates from './decorates'
const ignores = ['definition', 'nil', '_', 'eq', 'anyOf', 'allOf', 'optional', 'ref', 'self', 'not']
export default Object.keys(types).filter(type => {
    return !decorates.some(decorate => {
        return decorate.displayText === type
    }) && !ignores.some(item => item === type)
}).map(type => {
    return {
        text: type,
        displayText: type,
    }
})
