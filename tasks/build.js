var gulp = require('gulp');
var ts = require('gulp-typescript');
var sourcemaps = require('gulp-sourcemaps');
var path = require('path');

function compile() {
    return gulp.src('./src/**/*.ts')
        .pipe(sourcemaps.init())
        .pipe(ts(require('../tsconfig.json').compilerOptions))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./dist'));
}

module.exports = {
    compile
};