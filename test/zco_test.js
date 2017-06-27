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
		var future = co(function  * (next) {
				var a = yield sync_code_error(next);
				return 10;
			});
		future(function (err, v) {
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
			co(function  * (next, defer) {
				defer(function  * () {
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

	it("the arg of the defer should be a generator function", function (done) {
		co(function  * (next, defer) {
			defer(function () {});
		})((err) => {
			if (!err) {
				done(new Error("should throw error if the arg of defer is not a generator function"));
			} else {
				done();
			}
		})
	})

	it("I can only defer once", function (done) {
		co(function  * (next, defer) {
			defer(function  * () {});
			defer(function  * () {});
		})((err) => {
			if (!err) {
				done(new Error("I can only defer once"));
			} else {
				done();
			}
		})
	})
})

describe("no need next when return co", function () {
	it("no need next", function (done) {
		co(function  * (next, defer) {
			let[err, data] = yield co_func1(1, 2, 3);
			if (err) {
				done(err);
			}
			if (data != 6) {
				done(new Error("data should be 6"));
			}

		})((err) => {
			if (err) {
				done(err);
			} else {
				done();
			}
		})
	})
})
describe("co.all", function () {

	it("all :co func", function (done) {
		co(function  * (next, defer) {
			let[err, result] = yield co.all(co_func1(1, 2, 3), co_func2(3, 4, 5));
			if (err) {
				done(err);
			} else if (result[0] != 6 || result[1] != 12) {
				done(new Error("wrong result"));
			} else {
				done();
			}
		})()
	})

	it("all :generic func", function (done) {
		co(function  * (next, defer) {
			let[err, data] = yield co.all(function (cb) {
					cb(100);
				});
			if (err) {
				done(err);
			} else if (data[0] != 100) {
				done(new Error("wrong number"))
			} else {
				done();
			}
		})()
	})

	it("all :generic func error", function (done) {
		co(function  * (next, defer) {
			let[err, data] = yield co.all(function (cb) {
					throw new Error("manual error");
					cb(100);
				});
			if (!err) {
				done(new Error("error should be caught!"));
			} else {
				done();
			}
		})()
	})
	var co_error_func = function () {
		return co(function  * (next) {
			throw new Error("error");
		})
	}

	it("all :catch error occurred in co", function (done) {
		co(function  * (next) {
			let future = co.all(co_error_func(), co_func1(1, 2, 3), "null")
				let[err] = yield future;
			if (!err) {
				done(new Error("error should be caught"));
			} else {
				done();
			}
		})()
	})

	it("all :timeout", function (done) {
		co(function  * (next) {
			let[err] = yield co.all(function (cb) {
					setTimeout(cb, 1000);
				}, 10);
			if (!err || err.message != "timeout") {
				done(new Error("should timeout"));
			} else {
				done();
			}
		})()
	})

	it("all :not timeout", function (done) {
		co(function  * (next) {
			let[err] = yield co.all(function (cb) {
					setTimeout(cb, 10);
				}, 100);
			if (err) {
				done(err);
			} else {
				done();
			}
		})()
	})

	it("all :no action", function (done) {
		co(function  * () {
			let[err, data] = yield co.all();
			if (err) {
				done(err);
			} else if (data.length != 0) {
				done(new Error("if no action for co.all,data should be empty"))
			} else {
				done();
			}
		})()
	})

	it("all:actions(zco future) should be suspended when timeout", function (done) {
		var varialble1 = 1,
		varialble2 = 2;
		var action1 = function () {
			return co(function  * (next) {
				varialble1 = 11;
				yield setTimeout(next, 20);
				varialble1 = 111;
			})
		}
		var action2 = function () {
			return Promise.resolve();
		}

		co(function  * (next) {
			varialble2 = 22;
			let[err] = yield co.all(action1(), co.wrapPromise(action2()), 10);
			if (err) {
				throw err;
			} else {
				varialble2 = 222;
			}
		})((err) => {
			if (err && err.message == "timeout") {
				if (varialble1 == 11 && varialble2 == 22) {
					done()
				} else {
					done(new Error());
				}
			} else {
				done();
			}
		})
	})
	it("all:should be thrown out if no handler provided", function (done) {
		try {
			co.all(function () {
				throw new Error();
			})();
		} catch (e) {
			if (e) {
				done()
			} else {
				done(new Error());
			}
		}
	})
	it("all:should be thrown out if no handler provided (zco future)", function (done) {
		try {
			co.all(co(function *() {
				throw  new Error()
			}))();
		} catch (e) {
			if (e) {
				done()
			} else {
				done(new Error());
			}
		}
	})
})

describe("yield Promise", function () {
	var promise_api = function () {
		return Promise.resolve().then(function () {
			return 6;
		});
	}
	it("should support promise", function (done) {
		co(function  * (next) {
			let[err, data] = yield co.wrapPromise(promise_api());
			if (err) {
				done(err);
			} else if (data != 6) {
				done(new Error("wrong data"));
			} else {
				done();
			}
		})()
	})

	var promise_api_error = function () {
		return Promise.resolve().then(function () {
			throw new Error();
		})
	}

	it("should catch error throwed by Promise", function (done) {
		co(function  * (next) {
			let[err] = yield co.wrapPromise(promise_api_error());
			if (!err) {
				done(new Error());
			} else {
				done();
			}
		})()
	})

	it("should throw error when not a Promise", function (done) {
		co(function  * (next) {
			yield co.wrapPromise("");
		})((err) => {
			if (!err) {
				done(new Error("should throw error"));
			} else {
				done();
			}
		})
	})
})

describe("timeLimit", function () {
	it("should throw timeout", function (done) {
		co.timeLimit(2 * 10, co(function  * (next) {
				yield setTimeout(next, 5 * 10);
			}))((err) => {
			if (err && err.message == "timeout") {
				done()
			} else {
				done(new Error());
			}
		})
	});

	it("should be suspended when timeout", function (done) {
		var varialble1 = 1,
		varialble2 = 2;
		var func1 = function () {
			return co(function  * (next, defer) {
				defer(function  * () {})
				varialble1 = 11;
				yield setTimeout(next, 2 * 10);
				varialble1 = 111;
			})
		}
		var future = co(function  * (next) {
				varialble2 = 22;
				yield func1();
				varialble2 = 222;
			});

		co.timeLimit(1 * 10, future)((err) => {
			setTimeout(function () {
				if (err && err.message == "timeout") {
					if (varialble1 != 11 || varialble2 != 22) {
						done(new Error());
					} else {
						done();
					}
				} else {
					done(new Error());
				}
			}, 3 * 10);
		})
	})
	it("should throw error when wrong timeout setting1", function (done) {
		try {
			co.timeLimit("l", co(function  * () {}))()
		} catch (e) {
			if (e) {
				done()
			} else {
				done(new Error());
			}
		}
	})

	it("should throw error when wrong timeout setting2", function (done) {
		try {
			co.timeLimit(-100, co(function  * () {}))()
		} catch (e) {
			if (e) {
				done()
			} else {
				done(new Error());
			}
		}
	})

	it("should throw error when not zco future", function (done) {
		try {
			co.timeLimit(100, function () {})()
		} catch (e) {
			if (e) {
				done()
			} else {
				done(new Error());
			}
		}
	})

	it("not timeout branch", function (done) {
		var future = co.timeLimit(10 * 1000, co(function  * () {
					return 1;
				}));

		future((err) => {
			if (err) {
				done(err);
			} else {
				done();
			}
		})
	})

	it("co.all timeout case", function (done) {
		co.timeLimit(10, co(function  * (next) {
				yield co.all(function (cb) {
					setTimeout(cb, 10 * 1000);
				});
			}))((err) => {
			if (err) {
				done();
			} else {
				done(new Error());
			}
		});
	})

	it("co.timeLimit self timeout case", function (done) {
		co.timeLimit(10, co.timeLimit(3 * 10, co(function  * (next) {
					yield setTimeout(next, 2 * 10);
				})))((err) => {
			if (err) {
				done();
			} else {
				done(new Error());
			}
		})
	});
	it("co.timeLimit error should be thrown out when no handler", function (done) {
		var error=null;
		try {
			co.timeLimit(100, co(function  * () {
					throw new Error();
				}))()
		} catch (e) {
			error=e;
		}
	    if(error!=null){
			done();
		}else{
			done(new Error());
		}
	})
})

describe("brief model",function () {
	
	it("return single value",function (done) {
		var co_func=function () {
			return co(function *() {
				return 10;
			})
		}
		co.brief(function *() {
			let d=yield co_func();
			if(d!=10){
				done(new Error());
			}else{
				done();
			}
		})()
	})

	it("when error",function (done) {
		var co_func=function () {
			return co(function *() {
				throw new Error();
			});
		}
		co.brief(function *() {
			let d=yield co_func();
			if(d==10){
				done(new Error());
			}
		})((err)=>{
			if(err==null){
				done(new Error());
			}else{
				done()
			}
		})
	})
	
})

describe("coverage test",function () {
	var func1=function(){
		return co(function *() {
			throw new Error()
		})
	};
	var func2=function (cb) {

		setTimeout(function () {
			cb();
		},40);
		throw new Error();
	}

	it("co.all line274",function (done) {
		co(function *(co_next) {
          yield co.all(func1(),func2);
		  yield setTimeout(co_next,60);
		})(()=>{
           done()
		})
	})

	it("co.all line294",function (done) {
		var error=null;
		try{
			co.all(func1())();
		}catch (e){
			error=e;
		}finally {
			if(error==null){
				done(new Error());
			}else{
				done()
			}
		}
	})

	it("co.all timeout suspend",function (done) {
		var future=null;
		co.timeLimit(10,co(function *() {
            future= co.all(function (cb) {
			   setTimeout(function () {
				   cb();
			   },1000);
		   },2000)
			yield future;

		}))(()=>{
			future.__suspend__();//try to suspend a already return future
			done();
		})
	})

})


describe("ctx",function () {
	
	it("simple",function (done) {
		function func1() {
			return co(function *() {
				if(this.ctx.user=="Jack"){
					done();
				}else{
					done(new Error());
				}
			});
		}
		co(function *() {
			this.ctx.user="Jack";
			yield func1();
		})()
	});
	
	it("with .timeLimit",function (done) {
		function func1() {
			return co(function *() {
				if(this.ctx.user=="Jack"){
					done();
				}else{
					done(new Error());
				}
			});
		}
		co(function *() {
			this.ctx.user="Jack";
			yield co.timeLimit(1,func1());
		})()
	});

	it("with .all",function (done) {
		function func1() {
			return co(function *() {
				if(this.ctx.user=="Jack"){
					done();
				}else{
					done(new Error());
				}
			});
		}
		co(function *() {
			this.ctx.user="Jack";
			yield co.all(func1(),1);
		})()
	});

	it("when  callback api",function (done) {
		function func1(callback) {
			 setTimeout(function () {
				 if("function" === typeof callback.ctx){
					 if(callback.ctx().user=="Jack"){
						 done();
					 }else{
						 done(new Error());
					 }
				 }else{
					 done(new Error());
				 }
			 },10)
		}
		co(function *(co_next) {
			this.ctx.user="Jack";
			yield func1(co_next);
		})()
	});
	
});
