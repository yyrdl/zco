/**
 * Created by yyrdl on 2017/3/14.
 */
var slice = Array.prototype.slice;

var co = function (gen) {

	var iterator,
	callback = null,
	hasReturn = false,
	deferFunc = null;

	var _end = function (e, v) {
		var _cb = function (err) {
			callback && callback(e || err, v); //I shoudn't catch the error throwed by user's callback
			if (callback == null && (e || err)) { //the error should be throwed if no handler instead of  catching silently
				throw e || err;
			}
		}
		if (deferFunc) {
			deferFunc(function (err) {
				_cb(err);
			});
		} else {
			_cb();
		}
	}
	
	var run = function (arg) {
		try {
			var v = iterator.next(arg);
			hasReturn = true;
			v.done && _end(undefined, v.value);
		} catch (e) {
			_end(e);
		}
	}
	var nextSlave = function (arg) {
		hasReturn = false;
		run(arg);
	}
	var defer = function (func) {
		if (deferFunc != null) {
				throw new Error("you can only defer once");
		}else if ("[object GeneratorFunction]" !== Object.prototype.toString.call(func)) {
			throw new TypeError("the arg of refer must be a generator function");
		}else{
			deferFunc=co(func);	
		}
	}
	var next = function () {
		var arg = slice.call(arguments);
		if (!hasReturn) { //support fake async operation,avoid error: "Generator is already running"
			setTimeout(nextSlave, 0, arg);
		} else {
			nextSlave(arg);
		}
	}

	if ("[object GeneratorFunction]" === Object.prototype.toString.call(gen)) { //todo: support other Generator implements
		iterator = gen(next, defer);
	} else {
		throw new TypeError("the arg of co must be a generator function");
	}

	var future = function (cb) {
		if ("function" == typeof cb) {
			callback = cb;
		}
		run();
	}

	return future;
}

module.exports = co;
