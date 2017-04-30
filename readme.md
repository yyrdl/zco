[test_status_url]:https://travis-ci.org/yyrdl/zco.svg?branch=master
[coverage_status_url]:https://coveralls.io/repos/github/yyrdl/zco/badge.svg?branch=master
[coverage_page]:https://coveralls.io/github/yyrdl/zco?branch=master

# ZCO ![build status][test_status_url] [![Coverage Status][coverage_status_url]][coverage_page]

基于Generator的corountine模块,无外部依赖，支持defer和协程超时终止.

推荐支持解构语法node.js版本。


Generator based control flow, support `defer` and timeout coroutine suspension.

Recommend versions of node.js(or iojs)  which support the destructuring assignment syntax.

> __What's coroutine?__ coroutine is computer program component,it alow you write sync-style code ,but the code is running in async way. 协程是计算机程序组件，他允许我们写同步风格的但却是异步执行的代码。 


# Table Of Contents

*  [Special-Features](#special-features)
*  [Performance Battle](#performance-battle)
*  [Useage](#useage)
*  [Example](#example)
*  [Compare with tj's co,Promise, callback,and ES7 "async/await" when do samething](https://github.com/yyrdl/zco/blob/master/readmes/compare.md)


# Special Features

* __defer__  

与golang的defer关键字类似，`defer` 定义了一个在coroutine退出时必定会执行的操作，无论coroutine是否报错。可以使用defer定义一些退出时的清理工作，可类比C++的析构函数。

like in golang,`defer` define an operation that will be executed after the coroutine exit .you can set some clear-up work in defer, or define some operation that must be executed whenever there is error in coroutine.

* __coroutine suspension__ 

 zco 提供的`co.all`和`co.timeLimit`俩个方法支持设置超时时间，一旦超时，未完成的任务就没有继续执行的意义， zco将会终止超时的coroutine，避免无谓的资源消耗。
 
 `co.all` and `co.timeLimit` support timeout settiing. there is no reason to execute the unfinished coroutines which will be suspended.
  

# Performance Battle

    results for 20000 parallel executions, 1 ms per I/O op ,2017-04-16

    name                                                      timecost(ms)     memery(mb)       
    callback.js                                               105              31.0859375
    async-neo@1.8.2.js                                        175              48.5390625
    promise_bluebird@2.11.0.js                                702              92.46875
    co_zco_yyrdl@1.2.5.js                                     950              86.57421875
    async_caolan@1.5.2.js                                     1056             122.43359375
    co_when_generator_cujojs@3.7.8.js                         1107             117.51171875
    co_when_generator_cujojs_with_bluebird@3.7.8.js           1305             128.17578125
    co_tj_with_bluebird_promise@4.6.0.js                      1372             125.44140625
    promise_native.js                                         1397             170.75
    async_await_es7_with_native_promise.js                    1402             159.4765625
    co_when_generator_cujojs_with_native_promise@3.7.8.js     1656             169.26171875
    co_tj_with_native_promise@4.6.0.js                        1756             162.4375
    async_await_es7_with_bluebird_promise.js                  1789             197.92578125
    co_coroutine_bluebird@2.11.0.js                           4254             242.26171875
    


    Platform info:
    Windows_NT 10.0.14393 x64
    Node.JS 7.7.3
    V8 5.5.372.41
    Intel(R) Core(TM) i5-3210U CPU @ 2.50GHz × 4

# Useage

	npm install zco

# Example

### Simple Useage

```javascript

const co = require("zco");
const request = require("request")

const fake_async_func = function (callback) { //support operation that is not an real-async action
	callback(undefined, "hello world");
}

co(function  * (next) {

	let[err, response, page] = yield request("http://www.google.com", next);	
    //do something ....
	
	let[err2, msg] = yield fake_async_func(next);
	console.log(err2); //null
	console.log(msg); //"hello world"
})()

```
### Defer

一个简单使用defer的例子:定义一个并发锁，控制访问谷歌首页的并发量是5，为保证锁被释放，在defer里调用`mutex.unLock` 方法.

A simple `defer` usage: define a concurrent lock ,make the max concurrency is  5 when request google main page. In order to make sure the lock is be freed after `lock` ,we invoke the `unLock` method in `defer`.

```javascript
const reuqest = require("request");

//define concurrent lock factory. 定义并发锁工厂
const ConcurrentLockFactory = {
	"new" : function (max_concurrent) {
		return {
			"current_running" : 0,
			"unLock" : function () {
				this.current_running--;
				this._awake();
			},
			"lock" : function () {
				this.current_running++;
			},
			"busy" : function () {
				return this.current_running > max_concurrent - 1;
			},
			"waitFree" : function (callback) {
				this._reply_pool.push(callback);
				this._awake();
			},
			"_reply_pool" : [],
			"_awake" : function () {
				if (this.current_running < max_concurrent) {
					let func = this._reply_pool.shift();
					if ("function" == typeof func) {
						func();
					}
				}
			}
		}
	}
}

//set max concurrency is 5

const mutex = ConcurrentLockFactory.new(5);

//the function below will make sure the max concurrency is 5,even if you invoke the method 10000 times at the same time
// 下面这个方法将确保最大并发量是5，即使同时调用这个方法10000次。

const requestGoogleMainPage = function () {
	return co(function  * (next, defer) {
		defer(function  * (inner_next,error) {//the error is the error occurred outside ,such as error throwed below
			mutex.unLock();//released the mutex
		});
		//concurrency control
		if (mutex.busy()) {
			yield mutex.waitFree(next);//wait free
		}
		mutex.lock();//lock the mutex
		let[err, res, body] = yield request.get('http://google.com', next);
		if (err) {
			throw err;
		}
		return body;
	});
}

```
### Zco.timeLimit

set a time limit,suspend the coroutine and throw an error when timeout.

为一个操作设置最大时间限制，超时未完成则挂起并抛出超时错误.

```javascript

var variable = 1;
co.timeLimit(1 * 10, co(function  * (next) {
	variable = 11;
	yield setTimeout(next, 2 * 10);//wait 20ms,等待20毫秒模拟耗时的操作，由于大于10ms，超时，将在这里被挂起
	variable = 111;
}))((err) => {
	console.log(err.message); //"timeout"
})

setTimeout(function () {
	console.log(variable);
	//output "11",not "111",because the coroutine was suspended when timeout.
	//打印出11 而不是111，是因为超时后该coroutine被挂起了，后面的语句将不会执行

}, 5 * 10);

//more example

var variable2 = 2;

const co_func = function () {
	return co(function  * (next) {
		variable2 = 222;
		yield setTimeout(next, 20);//be suspended here because of timeout
		variable2 = 2222;
	});
}

co.timeLimit(10, co(function  * (next) {
	variable2 = 22;
	yield co_func();
}))((err) => {
	console.log(err.message); //"timeout";
})

setTimeout(function () {
	console.log(variable2); //"222"
}, 40);

```

### Zco.all

execute operations concurrently

并发执行一个操作集.

```javascript

const co_func = function (a, b, c) {
	return co(function  * (next) {
	    yield setTimeout(next,10);//wait 10ms
		return a+b+c;
	})
}

const generic_callback = function (callback) { //the first arg must be callback
	callback(100);
}

co(function  * (next) {
	let timeout = 10 * 1000; //timeout setting
	let[err, result] = yield co.all(co_func(1, 2, 3), co_func(4, 5, 6), generic_callback, timeout); //support set timeout，支持设置超时

	console.log(err); //null
	console.log(result) //[6,15,[100]]
})()

```

### Zco nest

zco 嵌套

A demo that search github projects rank by star.

一个搜索github的例子，搜索结果按star的多少排序

```javascript
const co = require("zco");
const request = require("request");
const cheerio = require("cheerio");

const SEARCH_KEY = "generator based control flow";

//search project on github rank by stars;

const searchGithubRankByStars = function (key, maxPage = 1) {
	return co(function  * (next) {
		key = key.split(/\s/g).join("+");
		let list = [];
		for (let i = 0; i < maxPage; i++) {
			let url = "https://github.com/search?o=desc&p=" + (i + 1) + "&q=" + key + "&s=stars&type=Repositories&utf8=%E2%9C%93&_pjax=%23js-pjax-container";

			let[err, response, body] = yield request(url, next);//start search
			if (err) {
				throw err;
			}

			//parse
			let $ = cheerio.load(body.toString());
			$(".v-align-middle").each((_,item) => {
				list.push({
					"name" : $(item).text(),
					"url" : "https://github.com" + $(item).attr("href")
				});
			});
		}
		return list;
	});
}

co(function  * (next) {
	let[err, list] = yield searchGithubRankByStars(SEARCH_KEY, 2);
	if (err) {
		throw err;
	}
	return list;
})((err, list) => {
	if (err) {
		console.log(err);
	} else {
		console.log(list);
	}
})


```

### Catch Error

错误捕捉

```javascript

const sync_code_error = function (callback) {
	throw new Error("manual error");
	setTimeout(callback, 0);
}

co(function  * (next) {
	let a = yield sync_code_error(next);
	return 10;
})((err, v) => {
	console.log(err.message); //"manual error"
})


```

### When Promise

Even if not recommend Promise ,sometimes we can't bypass.

尽管不推荐使用Promise,zco也提供一个API来支持yield Promise.

```javascript

const promise_api = function (a, b) {
	return Promise.resolve().then(function () {
		return a + b;
	});
}

co(function  * (next) {

	let[err, data] = yield co.wrapPromise(promise_api(1, 2));
	/**
	 *  Can't yield Promise directly ,that's unsafe.Becauce some callback-style API also return a Promise at the
	 * same time,such as `pg.client.query`.
	 * */
	console.log(err); //null
	console.log(data) : //3;
})()

```


# License

MIT
