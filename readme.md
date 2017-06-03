[test_status_url]:https://travis-ci.org/yyrdl/zco.svg?branch=master
[coverage_status_url]:https://coveralls.io/repos/github/yyrdl/zco/badge.svg?branch=master
[coverage_page]:https://coveralls.io/github/yyrdl/zco?branch=master

# ZCO ![build status][test_status_url] [![Coverage Status][coverage_status_url]][coverage_page]

[中文](https://github.com/yyrdl/zco/blob/master/readmes/readme_ch.md)

Generator based control flow, no other dependence, support `defer` and timeout coroutine suspension.

Recommend versions of node.js(or iojs)  which support the destructuring assignment syntax.

> __What's coroutine?__ coroutine is computer program component,it alow you write sync-style code ,but the code is running in async way.  

# Table Of Contents

*  [Special-Features](#special-features)
*  [Performance Battle](#performance-battle)
*  [Useage](#useage)
*  [Example](#example)


# Special Features

* __callstack trace__
  
By default,zco will add callstack to error automatically ,it's a nice way to debug the error thrown by async function.

* __work with callback-api  gracefully__

Manny modules in node.js provide callback-api,such as `fs` ,you can use them without any wrap.

* __defer__  

 
Like in golang,`defer` define an operation that will be executed after the coroutine exit .you can set some clear-up work in defer, or define some operations that must be executed no matter if there is an error.


* __coroutine suspension__ 

  
 `co.all` and `co.timeLimit` support timeout settiing. there is no reason to execute the unfinished coroutines when timeout,and the coroutines  will be suspended.
  

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
	
	if(err2){
	 //do something,or
	 throw err2;
	}
	
	console.log(err2); //null
	
	console.log(msg); //"hello world"
	
	return msg;
	
})((err,result)=>{
    if(err){
	  console.log(err);//null
	}else{
	   console.log(result);//"hello world"
	}
});

```

Function `co` expect a generator function as it's argument,and return a zco `future`.`future` is a function, The argument of zco `future` is also a function which be called as zco `handler`.

### Callstack Trace 

By default ,zco will add callstack to error,  you can forbid the feature globally by invoking `zco.__TrackCallStack(false)` .


>this feature cost more time,but the performance is still not bad .see performance battle below. 

examples:

```javascript
const co = require("zco");

const async_func = function (json) {
	return co(function  * (co_next) {
		yield setTimeout(co_next, 1000); //wait 1 second,simulate async operation
		return JSON.parse(json);
	})
}

const callFunc1 = function (json) {
	return async_func(json);
}
 
callFunc1("{")((err) => {
	console.log(err.stack)
})

```

stack：

```
SyntaxError: Unexpected end of JSON input
    at JSON.parse (<anonymous>)
    at f:\social_insurance_test\co\co.js:6:19                       //where we call  `JSON.parse `
    at callFunc1 (f:\social_insurance_test\co\co.js:11:11)          //where we call  `async_func `
    at Object.<anonymous> (f:\social_insurance_test\co\co.js:14:1)  //where we call  `callFunc1 `
```

try it by yourself :)

### Defer

It's a little same with the keyword `defer` in golang. 
  
A simple `defer` usage: define a concurrent lock ,make the max concurrency is  5 when request google main page. 
In order to make sure the lock is be freed after `lock` ,we invoke the `unLock` method in `defer`.

> If error occured in the operation defined by `defer` ,the error will be passed to the `handler`,if no `handler` provided ,it will be thrown out.

```javascript
const reuqest = require("request");

//define concurrent lock factory. 
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

//the function below will make sure the max concurrency is 5,even if  invoke the method 10000 times at the same time

const requestGoogleMainPage = function () {
	return co(function  * (next, defer) {
		defer(function  * (inner_next,error) {//the error is the error occurred outside ,such as error thrown below
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

Set a time limit,suspend the coroutine and throw an error when timeout.if there are some operations defined by `defer`,the operations will be executed.
But different with normal coroutine exit,if error occured in these operations,the error will be ignored.



```javascript

var variable = 1;
co.timeLimit(1 * 10, co(function  * (next) {
	variable = 11;
	yield setTimeout(next, 2 * 10);//wait 20ms, 
	variable = 111;
}))((err) => {
	console.log(err.message); //"timeout"
})

setTimeout(function () {
	console.log(variable);
	
	//output "11",not "111",because the coroutine was suspended when timeout.
	 

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

Execute operations concurrently


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
	let[err, result] = yield co.all(co_func(1, 2, 3), co_func(4, 5, 6), generic_callback, timeout); //support set timeout， 

	console.log(err); //null
	console.log(result) //[6,15,[100]]
})()

```

### Nest Useage 

```javascript
const co = require("zco");

const co_func=function(i){
  return co(function*(){
     return 10*i;
  })
}


co(function  * () {
	let [err1, result1] = yield co_func(1);
	if (err1) {
		throw err1;
	}

	let [err2, result2] = yield co_func(2);
    if (err2) {
   		throw err2;
   	}

	return result1+result2;
})((err, result) => {
	if (err) {
		console.log(err);
	} else {
		console.log(result);
	}
})

//or

co.brief(function*(){

   let result1 = yield co_func(1);

   let result2 = yield co_func(2);

   return result1+result2;
})((err,result)=>{
    if (err) {//deal with error at end
   		console.log(err);
   	} else {
   		console.log(result);
   	}
});


```

zco suppose it's  possible that all operations will go wrong, so the first return-value always be error,the second one is the exact result returned by the function, because  error in different place has different meaning,we can deal with 
them in different way.

But sometimes ,we don't want to dealing  with error everywhere ,then we use `co.brief`


### Catch Error
 

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
     

    results for 20000 parallel executions, 1 ms per I/O op ,2017-06-03

	when turn off callstack-trace
     
	name                                                      timecost(ms)      memory(mb)       score(time+memory)     
    callback.js                                               96                30.23828125      46.5068
    async-neo@1.8.2.js                                        146               48.59765625      30.2967
    promise_bluebird@2.11.0.js                                509               84.8828125       10.1153
    co_zco_yyrdl@1.3.2.js                                     579               88.9609375       9.1068
    co_when_generator_cujojs@3.7.8.js                         721               117.109375       7.1949
    async_caolan@1.5.2.js                                     712               122.5859375      7.1672
    co_tj_with_bluebird_promise@4.6.0.js                      895               124.79296875     6.0711
    co_when_generator_cujojs_with_bluebird@3.7.8.js           916               131.3515625      5.8794
    async_await_es7_with_native_promise.js                    964               166.82421875     5.2861
    promise_native.js                                         949               179.29296875     5.2457
    co_tj_with_native_promise@4.6.0.js                        1107              163.2421875      4.8229
    co_when_generator_cujojs_with_native_promise@3.7.8.js     1112              173.63671875     4.719
    async_await_es7_with_bluebird_promise.js                  1183              191.41796875     4.3899
    co_coroutine_bluebird@2.11.0.js                           3695              242.4296875      2

    
    when turn on stack trace：


	name                                                      timecost(ms)      memory(mb)       score(time+memory)     
    callback.js                                               92                31.1015625       49.8332
    async-neo@1.8.2.js                                        166               47.7109375       28.3802
    promise_bluebird@2.11.0.js                                510               85.125           10.4324
    async_caolan@1.5.2.js                                     716               122.328125       7.3841
    co_when_generator_cujojs@3.7.8.js                         789               117.17578125     6.9716
    co_tj_with_bluebird_promise@4.6.0.js                      884               126.046875       6.2992
    co_when_generator_cujojs_with_bluebird@3.7.8.js           883               131.0234375      6.231
    co_zco_yyrdl@1.3.2.js                                     1181              94.42578125      5.8436
    promise_native.js                                         999               170.3125         5.2953
    async_await_es7_with_native_promise.js                    1022              161.47265625     5.2862
    co_tj_with_native_promise@4.6.0.js                        1089              162.99609375     5.0394
    async_await_es7_with_bluebird_promise.js                  1165              188.90625        4.6036
    co_when_generator_cujojs_with_native_promise@3.7.8.js     1231              173.71875        4.5379
    co_coroutine_bluebird@2.11.0.js                           3867              242.61328125     2

    Platform info:
    Windows_NT 10.0.14393 x64
    Node.JS 7.7.3
    V8 5.5.372.41
    Intel(R) Core(TM) i5-5200U CPU @ 2.20GHz × 4

	
	

# License

MIT
