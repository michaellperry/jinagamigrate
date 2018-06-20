var del = require('del');
var gulp = require('gulp');

var { compile } = require('./tasks/build');

function clean() {
    return del([ './dist/' ]);
}

gulp.task('clean', clean);

gulp.task('default', compile);