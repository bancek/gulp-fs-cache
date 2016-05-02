'use strict';

var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var async = require('async');
var through = require('through2');
var fsExtra = require('fs-extra');
var gutil = require('gulp-util');

function gulpFsCache(basePath) {
  var filesChecksums = {};
  var cachedFiles = [];

  function cacheFilePath(filePath, checksum) {
    var pathHash = crypto.createHash('md5').update(filePath).digest('hex');

    return path.join(basePath, pathHash + '-' + checksum);
  }

  function transform(file, enc, callback) {
    var _this = this;

    if (file.isNull()) {
      return callback(null, file);
    }

    if (file.isStream()) {
      return callback(new gutil.PluginError('gulp-fs-cache', {
        message: file.path + ': Streaming not supported'
      }));
    }

    var checksum = file.checksum;

    if (!checksum) {
      var contents = file.contents.toString('utf8');

      checksum = crypto.createHash('md5').update(contents).digest('hex');
    }

    var cachePath = cacheFilePath(file.path, checksum);

    fs.stat(cachePath, function (err) {
      if (err) {
        filesChecksums[file.path] = checksum;
        _this.push(file);
        callback();
      } else {
        cachedFiles.push({
          file: file,
          checksum: checksum
        });
        callback();
      }
    });
  }

  var stream = through.obj(transform);

  function restoreTransform(file, enc, callback) {
    var _this = this;

    var checksum = filesChecksums[file.path];

    var cachePath = cacheFilePath(file.path, checksum);

    fsExtra.outputFile(cachePath, file.contents, function (err) {
      if (err != null) {
        return callback(err);
      }

      if (file.sourceMap) {
        var sourceMapCachePath = cachePath + '.map';

        fsExtra.outputJson(sourceMapCachePath, file.sourceMap, function (err) {
          if (err != null) {
            return callback(err);
          }

          _this.push(file);
          callback();
        });
      } else {
        _this.push(file);
        callback();
      }
    });
  }

  function restoreFlush(callback) {
    var _this = this;

    async.each(cachedFiles, function (cachedFile, cb) {
      var file = cachedFile.file;
      var checksum = cachedFile.checksum;

      var cachePath = cacheFilePath(file.path, checksum);

      fsExtra.readFile(cachePath, function (err, contents) {
        if (err != null) {
          return cb(err);
        }

        file.contents = contents;

        var sourceMapCachePath = cachePath + '.map';

        fsExtra.readJson(sourceMapCachePath, function (err, sourceMap) {
          if (err == null) {
            file.sourceMap = sourceMap;
          }

          _this.push(file);
          cb();
        });
      });
    }, function (err) {
      callback(err);
    });
  }

  var restoreStream = through.obj(restoreTransform, restoreFlush);

  stream.restore = restoreStream;

  return stream;
}

module.exports = gulpFsCache;
