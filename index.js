/**
 * Created by yyrdl on 2017/3/14.
 */
var slice = Array.prototype.slice;

var co = function (gen) {

	var iterator,
	callback;

	var _end = function (e, v) {
		 callback(e, v); //I shoudn't catch the error throwed by user's callback
	}

	var next = function () {
		var v = iterator.next(slice.call(arguments));
		 v.done && _end(undefined, v.value);
	}

	var run = function () {
		var args = slice.call(arguments);
		var func = args.shift();
		args.push(next);
		try {
			 func.apply(null, args);
		} catch (e) {
			 _end(e);
		}
	}
	if (typeof gen === 'function') {
		iterator = gen(run);
	}

	var future = function (cb) {
		if ("function" != typeof cb) {
			throw new TypeError("the first argument must be function");
			return;
		}
		callback = cb;
		if (!iterator || typeof iterator.next !== 'function') {
			return callback(iterator);
		}
		return next();
	}

	return future;
}

module.exports = co;
