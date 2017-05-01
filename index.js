/**
 * Created by yyrdl on 2017/3/14.
 */
var slice = Array.prototype.slice;
var toString = Object.prototype.toString;

var isZcoFuture = function (future) {
	return future && ("function" === typeof future.__zco_suspend__);
}
var isPromise = function (pro) {
	return pro && "function" === (typeof pro.then) && "function" === (typeof pro.catch );
}
var co = function (gen) {

	var iterator,
	callback = null,
	hasReturn = false,
	deferFunc = null,
	suspended = false,
	current_child_future = null,
	hasCallback = false;

	var _run_callback = function (err, value) {
		if (!hasCallback) {
			hasCallback = true;
			if (callback != null) {
				callback(err, value);
			} else if (err) {
				throw err; //throw out if no handler privided
			}
		}
	}

	var _run_defer = function (err, value) {
		if (deferFunc != null) {
			var _func = co(deferFunc, "__wrap_zco_defer__", err); //build defer func,and delivery error
			_func(function (e) {
				if (e != null && callback === null) {
					throw e; //error occurred in defer,throw out if no handler privided
				} else {
					_run_callback(e || err, value)
				}
			});
		}
	}

	var _end = function (e, v) {
		if (deferFunc != null) {
			_run_defer(e, v);
		} else {
			_run_callback(e, v);
		}
	}

	var run = function (arg) {
		try {
			var v = iterator.next(arg);
			hasReturn = true;
			v.done && _end(null, v.value);

			if (!v.done && isZcoFuture(v.value)) {
				current_child_future = v.value;
				v.value(next); //support yield zco_future
			}
		} catch (e) {
			_end(e);
		}
	}

	var nextSlave = function (arg) {
		hasReturn = false;
		run(arg);
	}
	/**
	 * define defer
	 * */
	var defer = function (func) {
		if (deferFunc != null) {
			throw new Error("you can only defer once");
		} else if ("[object GeneratorFunction]" !== toString.call(func)) {
			throw new TypeError("The arg of refer must be a generator function!");
		} else {
			deferFunc = func;
		}
	}
	/**
	 * define zco future
	 * */
	var future = function (cb) {
		if ("function" == typeof cb) {
			callback = cb;
		}
		run();
	}

	future.__zco_suspend__ = function () {
		if (!suspended) {
			if (!hasCallback) {
				hasCallback = true;
				_run_defer(new Error("coroutine is suspended,maybe because of timeout."));
			}
			suspended = true;

			if (current_child_future != null) {
				current_child_future.__zco_suspend__();
			}

			iterator.return ();
		}
	}

	var next = function () {
		if (!suspended) {
			var arg = slice.call(arguments);
			if (!hasReturn) { //support fake async operation,avoid error: "Generator is already running"
				setTimeout(function () {
					nextSlave(arg);
				}, 0);
			} else {
				nextSlave(arg);
			}
		}
	}

	if ("[object GeneratorFunction]" === toString.call(gen)) { //todo: support other Generator implements
		if (arguments[1] === "__wrap_zco_defer__") {
			iterator = gen(next, arguments[2]);
		} else {
			iterator = gen(next, defer);
		}
	} else {
		throw new TypeError("The arg of co must be a generator function!");
	}

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
	var _suspend_zco_future = function () {
		for (var i = 0; i < actions.length; i++) {
			if (isZcoFuture(actions[i])) {
				actions[i].__zco_suspend__();
			}
		}
	}

	var _end = function (err, result, is_timeout) {
		if (!is_timeout && timeout_handle) {
			clearTimeout(timeout_handle);
		}
		if (!hasReturn) {
			hasReturn = true;

			if (is_timeout) { //self timeout ,suspend zco futures
				_suspend_zco_future();
			}

			if (cb !== null) {
				cb(err, result);
			} else if (err) {
				throw err;
			}
		}
	}

	var _run = function () {
		var num = 0;
		var result = [];

		var check = function () {
			if (hasReturn) {
				return;
			}
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
						if (isZcoFuture(actions[index])) {
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

		if (timeout !== null) {
			timeout_handle = setTimeout(function () {
					_end(new Error("timeout"), undefined, true);
				}, timeout)
		}

	}

	var future = function (callback) {
		if ("function" == typeof callback) {
			cb = callback;
		}
		_run();
	};

	future.__zco_suspend__ = function () {
		if (!hasReturn) {
			if (!hasReturn && timeout_handle != null) {
				clearTimeout(timeout_handle);
			}
			hasReturn = true;
			_suspend_zco_future();
		}
	}

	return future;
}

var wrapPromise = function (pro) {
	if (!isPromise(pro)) {
		throw new TypeError("The arg of wrapPromise must be an instance of Promise!");
	}
	var hasReturn = false;
	var future = function (callback) {
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
	future.__zco_suspend__ = function () {
		hasReturn = true;
	}
	return future;
}

var timeLimit = function (ms, future) {
	var timeout_handle = null,
	is_timeout = false,
	has_return = false,
	callback = null;

	if ("[object Number]" !== toString.call(ms) || ms < 0) {
		throw new TypeError("Illegal timeout setting!")
	}
	if (!isZcoFuture(future)) {
		throw new TypeError("You can only set timeout of zco future(value returned by zco)");
	}

	var cb_slave = function (err, result) {
		if (!has_return) {
			has_return = true;

			if (!is_timeout && timeout_handle != null) {
				clearTimeout(timeout_handle);
			}

			if (is_timeout) { //if timeout,suspend the operation
				future.__zco_suspend__();
			}

			if (callback) {
				callback(err, result);
			} else if (err) {
				throw err;
			}
		}
	}

	var t_future = function (cb) {
		if ("function" == typeof cb) {
			callback = cb;
		}
		timeout_handle = setTimeout(function () {
				is_timeout = true;
				cb_slave(new Error("timeout"));
			}, ms);
		future(cb_slave);
	}

	t_future.__zco_suspend__ = function () {
		if (!has_return) {
			has_return = true;
			if (!is_timeout && timeout_handle) {
				clearTimeout(timeout_handle);
			}
			future.__zco_suspend__();
		}
	}

	return t_future;

}

co.all = all;

/**
 *  I can't yield Promise directly ,that's unsafe.Becauce some callback-style API also return a Promise at the
 * same time,such as `pg.client.query`.
 *
 * */
co.wrapPromise = wrapPromise;

co.timeLimit = timeLimit;

module.exports = co;
