let kit = require('nokit')

module.exports = function (task) {
    task('default', function () {
        return kit.spawn('tsc', ['-w'])
    })

    task('test', function () {
        return kit.spawn('junit', ['test/*.js'])
    })
}