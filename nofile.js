let kit = require('nokit')

module.exports = function (task) {
    function pegBuild() {
        return kit.spawn('pegjs', ['-o', 'src/grammar/parser.js', 'src/grammar/lang.pegjs'])
    }
    task('default', function () {
        return pegBuild().then(function () {
            return kit.spawn('tsc', ['-w'])
        })
    })

    task('build', function () {
        return pegBuild().then(function () {
            return kit.spawn('tsc')
        })
    })

    task('test', function () {
        return pegBuild().then(function () {
            return kit.spawn('junit', ['test/*.js'])
        })
    })

    task('lab', function () {
        return pegBuild().then(function () {
            return kit.spawn('noe', [
                '-b', 'node',
                '-w', 'test/lab/lab.js', '--',
    
                '--harmony',
    
                'test/lab/lab.js'
            ]);
        })
    })
}
