[test_status_url]:https://travis-ci.org/yyrdl/zco.svg?branch=master
[coverage_status_url]:https://coveralls.io/repos/github/yyrdl/zco/badge.svg?branch=master
[coverage_page]:https://coveralls.io/github/yyrdl/zco?branch=master

# ZCO ![build status][test_status_url] [![Coverage Status][coverage_status_url]][coverage_page]

基于Generator的corountine模块,灵感来自TJ的[co](https://github.com/tj/co),但使用更加简洁高效。

推荐支持解构语法node.js版本。


Generator based control flow,inspired by tj's [co](https://github.com/tj/co) , but more brief and has better performance.

Recommend versions of node.js(or iojs)  which support the destructuring assignment syntax.


# Table Of Contents

*  [Why zco](#why-zco)
*  [Performance Battle](#performance-battle)
*  [Useage](#useage)
*  [Example](#example)
*  [Compare with tj's co,Promise, callback,and ES7 "async/await" when do samething](https://github.com/yyrdl/zco/blob/master/readmes/compare.md)


# Why zco?

   node.js 里面几乎所有的异步操作是回调的方式，比如文件模块（fs），为了使代码结构清晰,人们把回调包装成Promise，但这是不必要的。
 主流coroutine模块基本都要求yield之后的表达式返回一个Promise，开发Promise是为了清晰的代码，避免回调嵌套，coroutine模块也是同样的
 目的，那为什么还要依赖Promise呢！

   Most of asynchronous operations in node.js are based on callback ,people convert callback-style-code to Promise-style-code
 for a clear control-flow. And other coroutine modules do the same thing,but many of them require a Promise returned by the expression after `yield`.Promise is not necessary,and in order to use these coroutine module ,you have to do more to wrap callback api.

   zco 被设计成可以和回调风格的API无缝使用，无需额外包装回调，同时也兼容 Promise,性能更好，代码更简洁。


   __zco__ is designed to work with callback seamlessly,do less operation,has better performance and a more brief code .Features of zco(some are special):

   * __defer__ like in golang ,`defer` define an operation that will be executed before the coroutine exit.
   * __plural return value__   code like this `let [value1,value2,value3]=yield func(next)`
   * __working with callback seamlessly__  no need to wrap
   * __support fake asynchronous operation__  zco will check if it is real-async,this feature avoid error: "Generator is already running"
   * __error catch__  different with Promise,if no handler is provided ,the error will be throwed out
   * __zco nest__ 
   * __zco.all__
   * __support Promise__  not recommend,but also support
   

# Performance Battle

    results for 20000 parallel executions, 1 ms per I/O op ,2017-04-10

    name                                                      timecost(ms)     memery(mb)       
    callback.js                                               94               31.0625
    async-neo@1.8.2.js                                        172              48.58984375
    promise_bluebird@2.11.0.js                                672              85.77734375
    co_zco_yyrdl@1.2.3.js                                     850              78.1640625
    async_caolan@1.5.2.js                                     1067             122.47265625
    co_when_generator_cujojs@3.7.8.js                         1077             116.765625
    co_when_generator_cujojs_with_bluebird@3.7.8.js           1312             131.68359375
    co_tj_with_bluebird_promise@4.6.0.js                      1313             125.4453125
    async_await_es7_with_native_promise.js                    1373             160.55859375
    promise_native.js                                         1388             177.76171875
    co_tj_with_native_promise@4.6.0.js                        1653             162.546875
    co_when_generator_cujojs_with_native_promise@3.7.8.js     1705             169.24609375
    async_await_es7_with_bluebird_promise.js                  1780             198.07421875
    co_coroutine_bluebird@2.11.0.js                           4146             242.49609375
    


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

### Zco Nest

zco 嵌套

```javascript
const co = require("zco");
const request = require("request");
const cheerio = require("cheerio");

const SEARCH_KEY = "generator based control flow";

//seach project on github rank by stars;
const searchGithubRankByStars = function (key, maxPage = 1) {
	return co(function  * (next) {
		key = key.split(/\s/g).join("+");
		let list = [];
		for (let i = 0; i < maxPage; i++) {
			let url = "https://github.com/search?o=desc&p=" + (i + 1) + "&q=" + key + "&s=stars&type=Repositories&utf8=%E2%9C%93&_pjax=%23js-pjax-container";
			let[err, response, body] = yield request(url, next);
			if (err) {
				throw err;
			}
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

### Zco.all

execute operations concurrently

并发执行一个操作集.

```javascript
const async_func = function (a, b, c, callback) {
	setTimeout(() => {
		callback(a + b + c);
	}, 10)
}

const co_func = function (a, b, c) {
	return co(function  * (next) {
		let[d] = yield async_func(a, b, c, next);
		return d;
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

### Defer

`defer` 定义一个在当前co退出前一定会执行的操作，无论defer之后的代码是否报错。该功能可用来做一些清理工作。

`defer` define an operation that will be executed before the coroutine exit, even if error is occurred after `defer`.

```javascript

//define a resource ,that should be released after use;
const resource = {
	"referenceCount" : 0
}

const getResource = function () {
	resource.referenceCount += 1;
	return resource;
}
const releseResource = function (resour) {
	resour && (resour.referenceCount--);
}

co(function  * (next, defer) {
	let resour = null;
	defer(function  * (inner_next) { //the arg of defer must be a generator function
		releseResource(resour); //we should release the resource after use
	});
	
	resour = getResource();
	//..........
	throw new Error(); //even if error occurred ,the operation defined by defer will be executed
})();

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
