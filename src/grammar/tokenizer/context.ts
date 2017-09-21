import State from './state'

class Context {
    state = [State.start]
    string = ''
    backed = true
    commitIndent = 0
    pushIndent = 0
    indent = 0
    style = null
}

export default Context
