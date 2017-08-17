(function (win) {
    /**
     * Created by jason on 2017/8/17.
     */

    var slice = Array.prototype.slice;
    var toString = Object.prototype.toString;

    var isZcoFuture = function (future) {
        return future && ("function" === typeof future.__suspend__) && ("function" === typeof future.__ctx__);
    }

    var isPromise = function (pro) {
        return pro && ("function" === (typeof pro.then)) && ("function" === (typeof pro.catch ));
    }

    var WRAP_DEFER_MODEL = 1;
    var BRIEF_MODEl = 2;

    var zco_core = function (gen, model) {

        var iterator = null,
            callback = null,
            hasReturn = false,
            deferFunc = null,
            suspended = false,
            current_child_future = null,
            hasRunCallback = false,
            internal = false;

        var _this = {
            "ctx": {}
        };


        var zco_core_run_callback = function (error, value) {

            if (callback != null) {
                return callback.apply(_this, [error, value]);
            }

            if (error) {
                throw error; //your code throws an error ,but no handler provided ,zco throws it out ,do not catch silently
            }
        }

        var zco_core_make_defer_func = function (error) {
            return zco_core(deferFunc, WRAP_DEFER_MODEL, error); //build defer func,and delivery error
        }

        var zco_core_return = function (e, v) {

            if (hasRunCallback) {
                return;
            }

            hasRunCallback = true;

            if (deferFunc != null) {

                var _func = zco_core_make_defer_func(e);
                _func.__ctx__(_this.ctx);

                return _func(function (ee) {
                    if (ee != null && callback === null) {
                        throw ee; //error occurred in defer,throw out if no handler provided
                    } else {
                        zco_core_run_callback(e || ee, v)
                    }
                });

            }

            return zco_core_run_callback(e, v);

        }

        var zco_core_run = function (arg) {

            var v = null,
                error = null;

            try {
                v = iterator.next(arg);
                hasReturn = true;
            } catch (e) {
                error = e;
            }

            if (error != null) {
                return zco_core_return(error);
            }

            if (v.done) {
                return zco_core_return(null, v.value);
            }

            if (isZcoFuture(v.value)) {
                current_child_future = v.value;
                internal = true;
                v.value.__ctx__(_this.ctx);
                return v.value(zco_core_next);
            }

        }

        var zco_core_nextSlave = function (arg) {
            hasReturn = false;
            return zco_core_run(arg);
        }
        /**
         * define defer
         * */
        var defer = function (func) {

            if (deferFunc != null) {
                throw new Error("you can only defer once");
            }

            if ("[object GeneratorFunction]" !== toString.call(func)) {
                throw new TypeError("The arg of refer must be a generator function!");
            }

            deferFunc = func;

        }
        /**
         * define zco future
         * */
        var zco_core_future = function (cb) {
            if ("function" == typeof cb) {
                callback = cb;
            }
            zco_core_run();
        }

        /**
         * define 'suspend' method
         * */
        zco_core_future.__suspend__ = function () {
            if (hasRunCallback || suspended) {
                return;
            }

            suspended = true;

            hasRunCallback = true;

            if (deferFunc != null) {

                var _func = zco_core_make_defer_func(new Error("coroutine is suspended,maybe because of timeout."));

                /**
                 * run defer ,ignore the error occurred in defer
                 * */
                _func(function () {});
            }

            /**
             * suspend child future
             * */

            if (current_child_future != null) {
                current_child_future.__suspend__();
            }

            iterator.return ();

        }

        zco_core_future.__ctx__ = function (ctx) {
            _this.ctx = ctx;
        }

        var zco_core_next = function () {
            if (suspended) {
                return;
            }

            var arg = slice.call(arguments);

            if (model === BRIEF_MODEl && true === internal) {
                if (arg[0] !== null) {
                    return zco_core_return(arg[0]);
                }
                arg = arg[1];
            }

            internal = false;

            if (!hasReturn) { //support fake async operation,avoid error: "Generator is already running"

                setTimeout(function () {

                    zco_core_nextSlave(arg);

                }, 0);

            } else {

                zco_core_nextSlave(arg);

            }
        }

        zco_core_next.ctx = function () {
            return _this.ctx;
        }

        if ("[object GeneratorFunction]" === toString.call(gen)) { //todo: support other Generator implements

            if (model === WRAP_DEFER_MODEL) {

                iterator = gen.apply(_this, [zco_core_next, arguments[2]]);

            } else {

                iterator = gen.apply(_this, [zco_core_next, defer]);

            }

        } else {

            throw new TypeError("The arg of co must be a generator function!");

        }

        return zco_core_future;
    }

    var all = function () {

        var timeout_handle = null,
            cb = null,
            hasReturn = false,
            actions = [],
            timeout = null,
            args = slice.call(arguments);

        var _this = {
            "ctx": {}
        };

        /**
         * make timeout error here ,get the current error stack,reset the top frame of the stack to where  the `all` function is called
         */
        var timeout_error = track.makeTimeoutError("timeout");

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

                    actions[i].__suspend__();

                }
            }
        }

        var _end = function (error, result, is_timeout) {

            if (hasReturn) {
                return;
            }

            hasReturn = true;

            if (!is_timeout && timeout_handle !== null) {

                clearTimeout(timeout_handle);

            }

            if (is_timeout || null !== error) { //self timeout or error occurred ,suspend zco futures
                _suspend_zco_future();
            }

            if (cb !== null) {
                return cb.apply(_this, [error, result]);
            }

            if (error) { //your code throws an error ,but no handler provided ,zco throws it out ,do not catch silently
                throw error; //something error ,or timeout
            }

        }

        var _run = function () {

            var has_done = 0,
                result = [];

            var check = function () {
                if (hasReturn) {
                    return;
                }

                has_done++;

                if (has_done == actions.length) {
                    _end(null, result, false);
                }
            }

            if (actions.length == 0) {

                return _end(null, [], false);

            }

            for (var i = 0; i < actions.length; i++) {

                (function (index) {
                    var _action = actions[index];
                    if (isZcoFuture(_action)) {

                        _action.__ctx__(_this.ctx);

                        _action(function (err, data) {
                            if (err) {
                                return _end(err, null, false);
                            }
                            result[index] = data;
                            check();
                        });

                    } else {
                        try {

                            var slave_cb = function () {
                                var return_value = slice.call(arguments);
                                result[index] = return_value;
                                check();
                            };

                            slave_cb.ctx = function () {
                                return _this.ctx;
                            }

                            _action(slave_cb);

                        } catch (e) {
                            _end(e, null, false);
                        }
                    }

                })(i)
            }

            if (timeout !== null) {

                timeout_handle = setTimeout(function () {
                    _end(timeout_error, null, true);
                }, timeout)
            }

        }

        var future = function (callback) {

            if ("function" == typeof callback) {

                cb = callback;

            }

            _run();
        };

        future.__suspend__ = function () {

            if (hasReturn) {

                return;
            }

            hasReturn = true;

            if (timeout_handle != null) {

                clearTimeout(timeout_handle);

            }

            _suspend_zco_future();
        }

        future.__ctx__ = function (ctx) {
            _this.ctx = ctx;
        }

        return future;
    }

    var wrapPromise = function (pro) {
        if (!isPromise(pro)) {
            throw new TypeError("The arg of wrapPromise must be an instance of Promise!");
        }

        var future = function (callback) {
            var _end = function (err, data) {
                callback && callback(err, data);
            }
            pro.then(function (data) {
                _end(null, data);
            }).catch (function (err) {
                _end(err);
            });
        }

        future.__suspend__ = function () {};
        future.__ctx__ = function () {}

        return future;
    }

    var timeLimit = function (ms, future) {

        var timeout_handle = null,
            is_timeout = false,
            has_return = false,
            callback = null;

        var _this={"ctx":{}};

        if ("[object Number]" !== toString.call(ms) || ms < 0) {

            throw new TypeError("Illegal timeout setting!")

        }
        if (!isZcoFuture(future)) {

            throw new TypeError("You can only set timeout of zco future(value returned by zco)");

        }
        /**
         * make timeout error here ,get the current error stack,reset the top frame of the stack to where  the `timeLimit` function is called
         */
        var timeout_error = track.makeTimeoutError("timeout");

        var cb_slave = function (err, result) {
            if (has_return) {
                return;
            }

            has_return = true;

            if (!is_timeout && timeout_handle != null) {
                clearTimeout(timeout_handle);
            }

            if (is_timeout) { //if timeout,suspend the operation
                future.__suspend__();
            }

            if (callback) {
                return callback.apply(_this,[err, result]);
            }

            if (err) { //your code throws an error ,but no handler provided ,zco throws it out ,do not catch silently
                throw err;
            }
        }

        var t_future = function (cb) {
            if ("function" == typeof cb) {
                callback = cb;
            }

            timeout_handle = setTimeout(function () {

                is_timeout = true;

                cb_slave(timeout_error);

            }, ms);

            future.__ctx__(_this.ctx);

            future(cb_slave);
        }

        t_future.__suspend__ = function () {
            if (has_return) {
                return;
            }

            has_return = true;

            if (!is_timeout && timeout_handle !== null) {

                clearTimeout(timeout_handle);

            }

            future.__suspend__();
        }

        t_future.__ctx__ = function (ctx) {
            _this.ctx = ctx;
        }

        return t_future;

    }

    var co = function (gen) {
        return zco_core(gen);
    }

    co.brief = function (gen) {
        return zco_core(gen, BRIEF_MODEl);
    }

    co.all = all;

    /**
     *  I can't yield Promise directly ,that's unsafe.Becauce some callback-style API also return a Promise at the
     * same time,such as `pg.client.query`.
     *
     * */
    co.wrapPromise = wrapPromise;

    co.timeLimit = timeLimit;

    win.zco = co;

})(window)