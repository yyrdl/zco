/**
 * Created by yyrdl on 2017/3/14.
 */
var slice = Array.prototype.slice;

var co = function (gen) {

	var iterator,
	callback = null;

	var _end = function (e, v) {
		callback && callback(e, v); //I shoudn't catch the error throwed by user's callback
	}

	var next = function () {
		try {
			var v = iterator.next(slice.call(arguments));
			v.done && _end(undefined, v.value);
		} catch (e) {
			_end(e);
		}
	}

	var run = function () {
		var args = slice.call(arguments);
		var func = args.shift();
		args.push(next);
		func.apply(this, args);
		return 0;
	}

	if ("[object GeneratorFunction]" === Object.prototype.toString.call(gen)) {
		iterator = gen(run);
	} else {
		throw new TypeError("the arg of co must be generator function")
	}

	var future = function (cb) {
		if ("function" == typeof cb) {
			callback = cb;
		}
		next();
	}

	return future;
}

module.exports = co;
