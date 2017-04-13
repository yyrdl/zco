/**
 * Created by yyrdl on 2017/3/14.
 */
var slice = Array.prototype.slice;
var toString = Object.prototype.toString;


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
			v.done && _end(null, v.value);
			!v.done && v.value && v.value.__zco_future__ && v.value(next); //support yield zco_future
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
		} else if ("[object GeneratorFunction]" !== toString.call(func)) {
			throw new TypeError("The arg of refer must be a generator function!");
		} else {
			deferFunc = co(func);
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

	if ("[object GeneratorFunction]" === toString.call(gen)) { //todo: support other Generator implements
		iterator = gen(next, defer);
	} else {
		throw new TypeError("The arg of co must be a generator function!");
	}

	var future = function (cb) {
		if ("function" == typeof cb) {
			callback = cb;
		}
		run();
	}

	future.__zco_future__ = true;

	return future;
}

var all = function () {
	var timeout_handle = null,
	cb = null,
	hasReturn = false,
	actions = [],
	timeout = null,
	args = slice.call(arguments);

	for (var i = 0; i < args.length; i++) {
		if ("function" == typeof args[i]) {
			actions.push(args[i]);
		} else if ("[object Number]" === toString.call(args[i])) {
			/**
			 * if the arg is number , treat as timeout
			 * */
			timeout = args[i];
			break;
		} else {
			break;
		}
	}

	var _end = function (err, result, istimeout) {
		if (!istimeout && timeout_handle) {
			clearTimeout(timeout_handle);
		}
		if (!hasReturn) {
			hasReturn = true;
			cb(err, result);
		}
	}

	var _run = function () {
		var num = 0;
		var result = [];

		var check = function () {
			num++;
			if (num == actions.length) {
				_end(null, result, false);
			}
		}

		if (actions.length == 0) {
			return _end(null, undefined, false);
		}

		for (var i = 0; i < actions.length; i++) {
			(function (index) {
				try {
					actions[index](function () {
						var res = slice.call(arguments);
						if (actions[index].__zco_future__) {
							if (res[0]) {
								_end(res[0], undefined, false);
							} else {
								result[index] = res[1];
								check();
							}

						} else {
							result[index] = res;
							check();
						}
					});
				} catch (e) {
					_end(e, undefined, false);
				}
			})(i)
		}

		if (timeout != undefined) {
			timeout_handle = setTimeout(function () {
					_end(new Error("timeout"), undefined, true);
				}, timeout)
		}

	}

	var future = function (callback) {
		if ("function" != typeof callback) {
			throw new TypeError("The arg of co.all's future must be a  function!");
		}
		cb = callback;
		_run();
	};

	future.__zco_future__ = true;

	return future;
}

var isPromise = function (pro) {
	return pro && "function" === (typeof pro.then) && "function" === (typeof pro.catch );
}

var wrapPromise = function (pro) {
	if(!isPromise(pro)){
		throw new TypeError("The arg of wrapPromise must be an instance of Promise!");
	}
	var future=function (callback) {
		var hasReturn = false;
		var _end = function (err, data) {
			if (!hasReturn) {
				hasReturn = true;
				callback && callback(err, data);
			}
		}
		pro.then(function (data) {
			_end(null, data);
		}).catch (function (err) {
			_end(err);
		});
	}
	future.__zco_future__=true;
	return future;
}


co.all = all;

/**
 *  I can't yield Promise directly ,that's unsafe.Becauce some callback-style API also return a Promise at the
 * same time,such as `pg.client.query`.
 *
 * */
co.wrapPromise=wrapPromise;

module.exports = co;
