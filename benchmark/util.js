/**
 * Created by jason on 2017/3/15.
 */

var fs = require("fs");
var co = require("../index");
var slice = [].slice;

exports.fileList = function (dir, cb) {
	co(function  * (next) {
		var files = [];
		var[err, list] = yield fs.readdir(dir, next);
		if (err) {
			return files;
		}
		for (var i = 0; i < list.length; i++) {
			var[er, stat] = yield fs.stat(dir + "/" + list[i], next);
			if (!er && stat.isFile() && list[i].endsWith(".js")) {
				files.push(list[i]);
			}
		}
		return files;
	})(cb)
}

exports.promisify = function (ctx, func, promise) {
	promise = promise || Promise;
	return function () {
		var args = slice.call(arguments);
		return new promise(function (resolve, reject) {
			var callback = function (err, data) {
				if (err) {
					reject(err);
				} else {
					resolve(data);
				}
			}
			args.push(callback);
			func.apply(ctx, args);
		});
	}
}
