/**
 * Created by jason on 2017/3/16.
 */

var co = require("../index");

var async_func1 = function (callback) {
	var error = undefined;
	setTimeout(function () {
		callback(error, "hello world");
	}, 1)
}

var async_func2 = function (a, b, c, callback) {
	setTimeout(function () {
		callback(a + b + c);
	}, 1)
}

var sync_code_error = function (callback) {
	throw new Error("manual error");
	setTimeout(callback, 0);
}

describe("normal use", function () {

	it("no args no callback", function (done) {
		co(function  * (next) {
			var[err, str] = yield async_func1(next);
			if (err != undefined) {
				done(new Error("err should be undefined"));
			} else if (str != "hello world") {
				done(new Error("str should be 'helllo world'"));
			} else {
				done();
			}
		})()
	})

	it("catch sync code error1", function (done) {
		co(function  * (next) {
			var a = yield sync_code_error(next);
			return 10;
		})(function (err, v) {
			if (!err) {
				done(new Error("err should not be undefined"))
			} else {
				done();
			}
		})
	})

	it("catch sync code error2", function (done) {
		co(function  * (next) {
			var a = yield async_func1(next);
			throw new Error("manual error");
			return 10;
		})(function (err, v) {
			if (!err) {
				done(new Error("err should not be undefined"))
			} else {
				done();
			}
		})
	})

	it("error should be throwed out if no handler instead of catching silently", function (done) {
		let error = undefined;
		try {
			co(function  * (next) {
				var a = yield sync_code_error(next);
				return 10;
			})();
		} catch (e) {
			error = e;
		}
		finally {
			if (!error) {
				done(new Error("err should not be undefined"))
			} else {
				done();
			}
		}
	});
	
	it("error should be throwed out if no handler instead of catching silently,throwed by defer", function (done) {
		let error = undefined;
		try {
			co(function  * (next,defer) {
				 defer(function*(){
					 throw new Error();
				 });
			})();
		} catch (e) {
			error = e;
		}
		finally {
			if (!error) {
				done(new Error("err should not be undefined"))
			} else {
				done();
			}
		}
	});

	it("delivery return value", function (done) {
		co(function  * (next) {
			return 100;
		})(function (err, age) {
			if (err) {
				done(new Error("err should  be undefined"))
			} else if (age != 100) {
				done(new Error("age should be 100"));
			} else {
				done();
			}
		})
	})

});

var co_func1 = function (a, b, c) {
	return co(function  * (next) {
		var[d] = yield async_func2(a, b, c, next);
		return d;
	})
}

var co_func2 = function (a, b, c) {
	return co(function  * (next) {
		var[err, data] = yield co_func1(a, b, c)(next);
		return data;
	})
}

describe("co nest", function () {
	it("nest testing", function (done) {
		co(function  * (next) {
			var[err, d] = yield co_func2(1, 2, 3)(next);
			if (err) {
				done(new Error("err should  be undefined"))
			}
			return d;
		})(function (err, d) {
			if (err) {
				done(new Error("err should  be undefined"))
			} else if (d != 6) {
				done(new Error("d should be 100"));
			} else {
				done();
			}
		})
	})
})

describe("throw error when not a generator function", function () {
	it("should throw error", function (done) {
		let error = undefined;
		try {
			co(function () {
				var d = 10;
				return d;
			})();
		} catch (e) {
			error = e;
		}
		finally {
			if (!error) {
				done(new Error("err should not be undefined"))
			} else {
				done();
			}
		}
	})
})

var fake_async_func = function (a, b, callback) {
	callback(a + b);
}

describe("support fake async func", function () {
	it("should not throw error", function (done) {
		co(function  * (next) {
			let[d] = yield fake_async_func(1, 2, next);
			return d;
		})((err, data) => {
			if (err) {
				done(new Error("err should  be undefined"))
			} else if (data != 3) {
				done(new Error("data should be 100"));
			} else {
				done();
			}
		});
	})
})

describe("defer", function () {
	it("should run defer before return ", function (done) {
		let record = [];

		co(function  * (next, defer) {
			defer(function  * () {
					record.push(2);
				});
			let[d] = yield fake_async_func(1, 2, next);
			record.push(1);
			return d;
		})((err, d) => {
			record.push(3);
			if (err != undefined) {
				done(new Error("err should  be undefined"))
			} else if (d != 3) {
				done(new Error("d should be 100"));
			} else if (record[0] != 1 || record[1] != 2 || record[2] != 3) {
				done(new Error("Wrong execution  order"));
			} else {
				done();
			}
		})
	})

	it("should catch the error throwed by defer ", function (done) {

		co(function  * (next, defer) {
			defer(function  * () {
					throw new Error("error in defer")
			});
		})((err) => {
			if (!err || err.message != "error in defer") {
				done(new Error("can't catch the error throwed by defer"));
			} else {
				done();
			}
		})

	})
	
	it("the arg of the defer should be a generator function",function(done){
		co(function  * (next, defer) {
			defer(function() {
				
			});
		})((err) => {
			if (!err) {
				done(new Error("should throw error if the arg of defer is not a generator function"));
			} else {
				done();
			}
		})
	})
	
	it("I can only defer once",function(done){
		co(function  * (next, defer) {
			defer(function * () {
				
			});
			defer(function * () {
				
			});
		})((err) => {
			if (!err) {
				done(new Error("I can only defer once"));
			} else {
				done();
			}
		})
	})
	
	
})
