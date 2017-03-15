/**
 * Created by yyrdl on 2017/3/14.
 */
var slice= Array.prototype.slice;

var co = function (gen) {
    var iterator;
    var callback;
    var errored = false;

    var future = function (cb) {
        callback = cb;
        next();
    }
    var error_end = function (e) {
        callback(e);
    }
    var next = function (res) {
        if (!errored) {
            try {
                var v = iterator.next(res);
                v.done?callback(undefined,v.value):v.value();
            } catch (e) {
                errored = true
                error_end(e);
            }
        }
    }

    var cb = function () {
        var args = slice.call(arguments);
        next(args);
    }

    var run = function () {
        var args = slice.call(arguments);
        var func = args.shift();
        args.push(cb);
        return function () {
            func.apply(null, args);
        };
    }

    if (typeof gen === 'function') {
        iterator = gen(run);
    }

    if (!iterator || typeof iterator.next !== 'function') {
        return iterator;
    }

    return future;
}

module.exports=co;

