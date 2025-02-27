var gulp         = require('gulp')
var path         = require('path')
var less         = require('gulp-less')
var autoprefixer = require('gulp-autoprefixer')
var sourcemaps   = require('gulp-sourcemaps')
var minifyCSS    = require('gulp-minify-css')
var rename       = require('gulp-rename')
var concat       = require('gulp-concat')
var uglify       = require('gulp-uglify')
var connect      = require('gulp-connect')
var open         = require('gulp-open')

gulp.task('css', ['less']);
gulp.task('default', ['less', 'js']);

gulp.task('less', function () {
  return gulp.src('./less/ui*')
    .pipe(sourcemaps.init())
    .pipe(less())
    .pipe(autoprefixer())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('../bower_components/'))
    .pipe(gulp.dest('../public/'))
})

gulp.task('less-min', ['less'], function () {
  return gulp.src('./less/toolkit*')
    .pipe(sourcemaps.init())
    .pipe(less())
    .pipe(minifyCSS())
    .pipe(autoprefixer())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('dist'))
})

gulp.task('js', function () {
  return gulp.src([
      //'./js/angular-init.js',
      './js/bootstrap/transition.js',
      './js/bootstrap/alert.js',
      './js/bootstrap/affix.js',
      './js/bootstrap/button.js',
      './js/bootstrap/carousel.js',
      './js/bootstrap/collapse.js',
      './js/bootstrap/dropdown.js',
      './js/bootstrap/modal.js',
      './js/bootstrap/tooltip.js',
      './js/bootstrap/popover.js',
      './js/bootstrap/scrollspy.js',
      './js/bootstrap/tab.js',
      './js/custom/*',
      //'./js/directives/*'
    ])
    .pipe(concat('toolkit.js'))
    .pipe(gulp.dest('dist'))
})
/*
gulp.task('js-min', ['js'], function () {
  return gulp.src('dist/*.js')
    .pipe(uglify())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('dist'))
})
*/