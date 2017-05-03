[test_status_url]:https://travis-ci.org/yyrdl/zco.svg?branch=master
[coverage_status_url]:https://coveralls.io/repos/github/yyrdl/zco/badge.svg?branch=master
[coverage_page]:https://coveralls.io/github/yyrdl/zco?branch=master

# ZCO ![build status][test_status_url] [![Coverage Status][coverage_status_url]][coverage_page]

基于Generator的协程模块,无外部依赖，支持defer和协程超时终止.

推荐支持解构语法node.js版本。

 

> __什么是协程?__  协程是计算机程序组件，他允许我们写同步风格的但却是异步执行的代码。 


#  内容目录

*  [特别功能](#special-features)
*  [性能测试](#performance-battle)
*  [安装](#useage)
*  [例子](#example)
*  [同Promise, ES7 async/await，还有TJ的CO做比较](https://github.com/yyrdl/zco/blob/master/readmes/compare.md)


# Special Features

* __defer__  

与golang的defer关键字类似，`defer` 定义了一个在coroutine退出时必定会执行的操作，无论coroutine是否报错。可以使用defer定义一些退出时的清理工作，可类比C++的析构函数。


* __coroutine suspension__ 

 zco 提供的`co.all`和`co.timeLimit`两个方法支持设置超时时间，一旦超时，未完成的任务就没有继续执行的意义， zco将会终止超时的coroutine，避免无谓的资源消耗。
 
# Useage

	npm install zco

# Example

### Simple Useage

```javascript

const co = require("zco");
const request = require("request")

const fake_async_func = function (callback) { //支持伪异步
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

 
```javascript
const reuqest = require("request");

//定义并发锁工厂
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

//生成一个并发锁，最大并发量是5

const mutex = ConcurrentLockFactory.new(5);

 
// 下面这个方法将确保最大并发量是5，即使同时调用这个方法10000次。

const requestGoogleMainPage = function () {

	return co(function  * (next, defer) {
	
		defer(function  * (inner_next,error) {//`inner_next`的功能和`next`一致，error是`co`捕获到的错误，比如下面代码抛出的错误
		
			mutex.unLock();//释放锁
			
		});
		
		//并发控制,忙则等待
		
		if (mutex.busy()) {
			yield mutex.waitFree(next);
		}
		
		mutex.lock();//持有锁
		
		let[err, res, body] = yield request.get('http://google.com', next);
		if (err) {
			throw err;
		}
		return body;
	});
}

```
### Zco.timeLimit

 
为一个操作设置最大时间限制，超时未完成则挂起并抛出超时错误.如果被挂起的协程有使用`defer`，那么被挂起时会同时运行`defer`定义的操作。

与正常退出执行`defer`定义的操作不同，如果`defer`定义的操作出现异常，那么异常将被忽略，但若是正常退出，则异常会被传递给最终的`handler`，

如果没有提供`handler`，则异常会被抛出。


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
	
	//打印出11 而不是111，是因为超时后该协程被挂起了，后面的语句将不会执行

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



并发执行一个操作集,前n个参数是要执行的操作，最后一个参数可以是数字，代表允许的最大执行时间，超时则会返回超时错误

```javascript

const co_func = function (a, b, c) {
	return co(function  * (next) {
	    yield setTimeout(next,10);//wait 10ms
		return a+b+c;
	})
}

const generic_callback = function (callback) { //第一个参数必须是回调函数
	callback(100);
}

co(function  * (next) {
	let timeout = 10 * 1000; //timeout setting
	let[err, result] = yield co.all(co_func(1, 2, 3), co_func(4, 5, 6), generic_callback, timeout); //支持设置超时时间，超时时间作为最后一个参数

	console.log(err); //null
	console.log(result) //[6,15,[100]]
})()

```

### Zco nest

zco 嵌套


一个搜索github的例子，搜索结果按star的多少排序

```javascript
const co = require("zco");
const request = require("request");
const cheerio = require("cheerio");

const SEARCH_KEY = "generator based control flow";//搜索的关键字

//根据关键字搜索github项目，根据star多少排序

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

# Performance Battle

    带co前缀的都属于协程模块

    results for 20000 parallel executions, 1 ms per I/O op ,2017-05-03

    name                                                      timecost(ms)     memery(mb)       
	callback.js                                               118              31.1640625       
	async-neo@1.8.2.js                                        182              48.58203125      
	promise_bluebird@2.11.0.js                                723              88.55859375      
	co_zco_yyrdl@1.2.8.js                                     996              84.04296875      
	async_caolan@1.5.2.js                                     1162             122.42578125     
	co_when_generator_cujojs@3.7.8.js                         1229             118.27734375     
	co_tj_with_bluebird_promise@4.6.0.js                      1422             116.88671875     
	co_when_generator_cujojs_with_bluebird@3.7.8.js           1436             139.03125        
	promise_native.js                                         1521             170.59765625     
	async_await_es7_with_native_promise.js                    1542             169.6015625      
	co_when_generator_cujojs_with_native_promise@3.7.8.js     1775             168.81640625     
	co_tj_with_native_promise@4.6.0.js                        1823             161.21484375     
	async_await_es7_with_bluebird_promise.js                  1988             197.8046875      
	co_coroutine_bluebird@2.11.0.js                           4469             227.10546875     
    


    Platform info:
    Windows_NT 10.0.14393 x64
    Node.JS 7.7.3
    V8 5.5.372.41
    Intel(R) Core(TM) i5-3210U CPU @ 2.50GHz × 4


# License

MIT
