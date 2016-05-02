/* global describe, it, beforeEach, afterEach */

'use strict';

var gutil = require('gulp-util');
var tmp = require('tmp');
var through = require('through2');
var fsCache = require('../');

require('mocha');
require('should');

describe('gulp-fs-cache', function () {
  var tmpObj;
  var tmpPath;

  beforeEach(function () {
    tmpObj = tmp.dirSync({unsafeCleanup: true});
    tmpPath = tmpObj.name;
  });

  afterEach(function () {
    tmpObj.removeCallback();
  });

  function processFiles(done) {
    var filesProcessedCount = 0;
    var filesRestoredCount = 0;
    var filesRestored = {};

    var stream = fsCache(tmpPath);

    var processStream = through.obj(function (file, enc, callback) {
      file.contents = Buffer.concat([file.contents, new Buffer('-processed')]);

      if (file.sourceMap != null) {
        file.sourceMap.source = 'map-processed';
      }

      filesProcessedCount++;
      callback(null, file);
    });

    var finalStream = stream.pipe(processStream).pipe(stream.restore);

    finalStream.on('data', function (file) {
      filesRestoredCount++;
      filesRestored[file.path] = file;
    });

    finalStream.once('end', function () {
      done({
        filesProcessedCount: filesProcessedCount,
        filesRestoredCount: filesRestoredCount,
        filesRestored: filesRestored
      });
    });

    var file1 = new gutil.File({path: 'file1.js', contents: new Buffer('file1')});
    var file2 = new gutil.File({path: 'file2.js', contents: new Buffer('file2')});
    file2.sourceMap = {source: 'map'};

    stream.write(file1);
    stream.write(file2);

    stream.end();
  }

  it('should process files with empty cache', function (done) {
    processFiles(function (res) {
      res.filesProcessedCount.should.equal(2);
      res.filesRestoredCount.should.equal(2);
      res.filesRestored['file1.js'].contents.toString('utf8').should.equal('file1-processed');
      res.filesRestored['file2.js'].contents.toString('utf8').should.equal('file2-processed');
      res.filesRestored['file2.js'].sourceMap.should.deepEqual({source: 'map-processed'});

      done();
    });
  });

  it('should not process files when cached', function (done) {
    processFiles(function (res) {
      res.filesProcessedCount.should.equal(2);
      res.filesRestoredCount.should.equal(2);
      res.filesRestored['file1.js'].contents.toString('utf8').should.equal('file1-processed');
      res.filesRestored['file2.js'].contents.toString('utf8').should.equal('file2-processed');
      res.filesRestored['file2.js'].sourceMap.should.deepEqual({source: 'map-processed'});

      processFiles(function (res) {
        res.filesProcessedCount.should.equal(0);
        res.filesRestoredCount.should.equal(2);
        res.filesRestored['file1.js'].contents.toString('utf8').should.equal('file1-processed');
        res.filesRestored['file2.js'].contents.toString('utf8').should.equal('file2-processed');
        res.filesRestored['file2.js'].sourceMap.should.deepEqual({source: 'map-processed'});

        done();
      });
    });
  });
});
