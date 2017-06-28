[test_status_url]:https://travis-ci.org/yyrdl/zco.svg?branch=master
[coverage_status_url]:https://coveralls.io/repos/github/yyrdl/zco/badge.svg?branch=master
[coverage_page]:https://coveralls.io/github/yyrdl/zco?branch=master

# ZCO ![build status][test_status_url] [![Coverage Status][coverage_status_url]][coverage_page]

[中文](https://github.com/yyrdl/zco/blob/master/readmes/readme_ch.md)

Generator based control flow, no other dependence.

Recommend versions of node.js  which support the destructuring assignment syntax.

> __What's coroutine?__ coroutine is computer program component,which allow you write sync-style code ,but the code is running in async way.

# The Features & Solve What!

`npm install zco`

* Be Used With Callback Directly, Avoid callback hell.

* ` this.ctx`: A global context for a single transaction

* `defer`:A promise(not Promise in es6) that the operation defined by defer will be executed at end no mater if there is an error!

* Support Consecutive Error Stack

### 1. Be Used With Callback Directly!

__Solve What__: [callback hell](http://callbackhell.com/).

Many operations in node.js is asynchronous, it's easy to fall into callback hell.Consider callback-style code like this:
```js
   const func = function (data0,callback){
      func1(data0,function(data1){
       func2(data1,function(data2){
          func3(data2,function(data3){
              setTimeout(function(){
                 callback(data3);
              },10);
          })
       })
    })
   }
```
what's a mess!  Lets's try zco!
```js
  const co = require("zco");
  const func = function (data0){
     return co(function*(co_next){
        let [data1] = yield func1(data0,co_next);
        let [data2] = yield func2(data1,co_next);
        let [data3] = yield func3(data2,co_next);
        yield setTimeout(co_next,10);
        return data3;
     })
  }
```
Wow ,much clearer ！

zco try to cooperate with callback directly.It's unnecessary to wrap callback-api.


### 2.  Future & Handler
In this section ,we will introduce two concepts of zco , it's `future` and `handler`.
We have created a function named `func` ,we will show how to use it.

Just invoke  directly:
```js
 func("a data")((err,data3)=>{
    if(err){
       console.log(err);
    }else{
       console.log(data3);
    }
 })
```
The value returned by `co()` called `future` which is a function，the argument of `future` called `handler`. The code above is  equivalent to code below:

```js
var future = func("a data");
var handler = (err,data3)=>{
    if(err){
       console.log(err);
    }else{
       console.log(data3);
    }
}
future(handler);
```
The first argument of `handler` is error, the second is  the value returned by you.

The code below show that we can yield `future` directly:

```js
   co(function*(){
     let [err,data3] = yield func("a data");
     if(err){
        console.log(err);
     }else{
        console.log(data3);
     }
   })();
```

### 3. this.ctx
`this.ctx` works like thread-local storage in threaded programming. Maybe you are a user of [node-continuation-local-storage](https://github.com/othiym23/node-continuation-local-storage),now, there is a much easier way.

__Solve What__ : A global context for a single transaction --- `this.ctx`.

An Example Scene:

An user launched a request, and there is a `trace_id` which is the identifying of this transaction. In order to accomplish the request ,you will invoke some modules  in your project.  And  it's necessary to add `trace_id` to log for analyze. A traditional way  is treating `trace_id` as a  parameter ,and pass it everywhere. Now,we can do it in a  more graceful way !

The code of the example scene:
```js
   //express router
   router.post("/api",function(req,res,next){
     co.brief(function*(){

        // Initialize trace_id from req.headers, and set it to this.ctx

        this.ctx.trace_id = req.headers.trace_id;

        //simulate the operations in production.
        let user_id = yield apis.findUserIdByUser(req.body.user);
        let phone_list = yield apis.findPhoneListByUserId(user_id);
        return phone_list;
     })(function(err,list){
        if(err){

           //get trace_id from this.ctx ,and add it to log
           log.error(err.stack,this.ctx.trace_id);

           res.json({"success":false,"msg":"internal error!"});
        }else{

            //get trace_id from this.ctx ,and add it to log
           log.info("request success",this.ctx.trace_id);

           res.json({"success":true,"msg":"success","phone_list":list});
        }
     })
   })
```
The code of `apis` used in the code above  which on behalf of the modules in your project:
```js
 exports.findUserIdByUser=function(user){
    return co(function*(){
       let user_id=null;
       //...  on behalf of some database operations.
       //get trace_id from this.ctx ,and add it to log
       log.info("find user success",this.ctx.trace_id);
       return user_id;
    });
 }

 exports.findPhoneListByUserId=function(user_id){
    return co(function*(){
        let phone_list=null;
        //... on behalf of some database operations.
        //get trace_id from this.ctx ,and add it to log
        log.info("find phone_list success",this.ctx.trace_id);
        return phone_list;
    });
}
```

More about `this.ctx`:

`this.ctx` is delivered  by zco  automatically ,when you yield a `future` ,it will deliver `this.ctx` by call
`future.__ctx__(this.ctx)`. Then ,how about yield a  ordinary callback-api:

```js
 const callback_api=function(num,callback){
    if("function" === typeof callback.ctx){
      callback(num+callback.ctx().base);
    }else{
      callback(num);
    }
 }
 co(function*(co_next){
    this.ctx.base = 1;
    let [result] =  yield callback_api(10,co_next);
    console.log(result);//11
 })()
```
The code above show that you can access `ctx` by call `co_next.ctx()`.

### 4. co_next & defer

You have saw `co_next` many times ,yeah , it's a common-callback, used to take the place of the origin callback, and accept the data that the callback-api passed to him.


__defer Solve What__ ：A promise(not Promise in es6) that the operation defined by defer will be executed at end no mater if there is an error! Be used to do some cleaning  work ,like `db.close()`

An Example Scene:
Suppose we need to design a function which will visit the main page of google, and the max concurrency must smaller than 5. At first ,we should write a concurrent lock , and use concurrent lock in the function. Code maybe like this:
```js
    mutex.lock();//hold the lock
    //... do the request here ,and some other operations
    //... Suppose code like `JSON.parse("{")` throws an error here.
    mutex.unLock();//release the lock
```
But  error maybe happen before `mutex.unLock`,there is no guarantee that the lock will be released.

We can solve this by `defer`:
```js
  co(function*(co_next,defer){
      defer(function*(){
         mutex.unLock();
      });

      mutex.lock();
      //... do the request here ,and some other operations
      //... Suppose code like `JSON.parse("{")` throws an error here.
      //But does not matter.
  })();
```

### 5. Consecutive Error Stack
As you know ,if an error occurred in an asynchronous function, it will lose call-stack which  make it difficult to debug .

__Solve What__： Support Consecutive Error Stack

code :
```js
const async_func=function(callback){
    setTimeout(function(){
       try{
         JSON.parse("{");
       }catch(e){
         callback(e);
       }
    },10)
}
const middle_call_path=function(cb){
  return async_func(cb)
}
middle_call_path((err)=>{
  console.log(err.stack);
});
```
Code above output:
```
SyntaxError: Unexpected end of JSON input
    at JSON.parse (<anonymous>)
    at Timeout._onTimeout (e:\GIT\test\zco.js:21:18)
    at ontimeout (timers.js:488:11)
    at tryOnTimeout (timers.js:323:5)
    at Timer.listOnTimeout (timers.js:283:5)
```
The stack of error didn't show where we call `async_func` and where we call `middle_call_path` ,we lose the callstack.

Rewrite the code by zco:
```js
const async_func=function(){
    return co(function*(co_next){
       yield setTimeout(co_next,10);
       JSON.parse("{");
    });
}
const middle_call_path=function(){
    return async_func()
}
middle_call_path()((err)=>{
    console.log(err.stack);
});
```
Ouput:
```
SyntaxError: Unexpected end of JSON input
    at JSON.parse (<anonymous>)
    at Object.<anonymous> (e:\GIT\test\zco.js:21:13)//where we call `JSON.parse`
    at middle_call_path (e:\GIT\test\zco.js:25:12) //where we call `async_func`
    at Object.<anonymous> (e:\GIT\test\zco.js:27:1)//where we call `middle_call_path`
```
We get the full clear chain of function call ,try it by yourself :)

### 6.zco.brief

zco suppose it's possible that all operations will go wrong, so the first return-value always be error,the second one is the exact result returned by you.Error in different place has different meaning,we can deal with them in different way.
But sometimes ,we don't want to dealing with error everywhere ,then we use `co.brief`

Example：
```js
const co_func=function(i){
  return co(function*(){
     return 10*i;
  })
}

co(function  * () {
	let [err1, result1] = yield co_func(1);
	if (err1) {
		throw err1;//we can throw the error ,or do something else
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

//or in brief model
// just care about the result ,deal with error at end
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

### 7. zco.timeLimit

This api allows you setting a time limit of an operation,when timeout ,it will throw a timeout error.

API: `co.timeLimit(ms,future)`

Example:
```js
co.timeLimit(1 * 10, co(function  * (co_next) {
	yield setTimeout(co_next, 2 * 10);//wait 20ms,
}))((err) => {
	console.log(err.message); //"timeout"
})
```
### 8.zco.all
Execute operations concurrently

API: `co.all(future...,[timeout setting])`;

Example:
```js
const co_func = function (a, b, c) {
	return co(function  * (co_next) {
	    yield setTimeout(co_next,10);//wait 10ms
		return a+b+c;
	})
}

const generic_callback = function (callback) { //the first arg must be callback
	callback(100);
}

co(function  * () {
	let timeout = 10 * 1000; //timeout setting
	let[err, result] = yield co.all(co_func(1, 2, 3), co_func(4, 5, 6), generic_callback, timeout); //support set timeout，

	console.log(err); //null
	console.log(result) //[6,15,[100]]
})()
```

###9.  When Promise

Even if not recommend Promise ,sometimes we can't bypass.


```javascript

const promise_api = function (a, b) {
	return Promise.resolve().then(function () {
		return a + b;
	});
}

co(function  * () {

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
