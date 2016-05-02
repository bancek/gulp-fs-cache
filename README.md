# gulp-fs-cache [![NPM version](https://badge.fury.io/js/gulp-fs-cache.png)](http://badge.fury.io/js/gulp-fs-cache) [![Build Status](https://travis-ci.org/bancek/gulp-fs-cache.svg?branch=master)](https://travis-ci.org/bancek/gulp-fs-cache)

`gulp-fs-cache` is a [gulp](https://github.com/gulpjs/gulp) plugin that saves processed files to filesystem. It removes already processed files from stream and adds it back after processing.

`gulp-fs-cache` works similar to `gulp-remember` but saves files to filesystem so they can be reused between multiple `gulp` runs (e.g. to speed up CI).

## Usage

```javascript
var gulp = require('gulp'),
    uglify = require('gulp-uglify'),
    sourcemaps = require('gulp-sourcemaps'),
    fsCache = require('gulp-fs-cache');

gulp.task('scripts', function () {
  var jsFsCache = fsCache('.tmp/jscache'); // save cache to .tmp/jscache
  return gulp.src('src/**/*.js')
      .pipe(sourcemaps.init())
      .pipe(jsFsCache)
      .pipe(uglify())
      .pipe(jsFsCache.restore)
      .pipe(sourcemaps.write('maps'))
      .pipe(gulp.dest('public/'));
});
```
