[test_status_url]:https://travis-ci.org/yyrdl/zco.svg?branch=master
[coverage_status_url]:https://coveralls.io/repos/github/yyrdl/zco/badge.svg?branch=master
[coverage_page]:https://coveralls.io/github/yyrdl/zco?branch=master

# ZCO ![build status][test_status_url] [![Coverage Status][coverage_status_url]][coverage_page]

基于Generator的协程模块,无外部依赖，

推荐支持解构语法node.js版本。







#  功能 和 要解决的问题

`npm install zco`


* 可以直接和回调结合使用，避免深层回调嵌套
* 为一次事务提供全局唯一的上下文 :`this.ctx`
* `defer` 保证由`defer`定义的操作无论代码是否报错都会在最后得到执行
* 提供连续的函数调用堆栈

### 1. 同回调协作

解决的问题: [深层回调嵌套](http://callbackhell.com/)

node.js 里面的大部分操作是异步的，非常容易陷入回调地狱，基于回调的业务逻辑通常不清晰明了，下面是一个回调风格的代码：

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
感觉有点混乱，用zco重写一下:

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

重写之后流程更清晰了。

如果是从C系语言转过来的程序员，看到回调风格的代码会很不适应，确实 同步的平铺直叙的代码更容易懂。

这个例子完整代码见 [here](https://github.com/yyrdl/zco_example/blob/master/callback_vs_zco/example1.js)

### 2. Future 和 Handler

`future`和`handler`是zco的两个主要概念。

在第一部分定义了`func`函数,下面直接调用一下：
```js
 func(1)((err,data3)=>{
    if(err){
       console.log(err);
    }else{
       console.log(data3);
    }
 })
```
`func`函数返回的是`co()`的执行结果，称`co`的返回值为`future`.`future`是一个特殊的函数，他的参数称为`handler`,`handler`也是一个函数，用来接收最后的结果，`handler`可以缺省。所以上面的代码等价为:

```js
var future = func(1);
var handler = (err,data3)=>{
    if(err){
       console.log(err);
    }else{
       console.log(data3);
    }
}
future(handler);
```
`handler`的第一个参数是error,第二个参数是`func`函数中return 的`data3`. zco 认为所有的操作都有可能出现异常，所以第一个参数默认永远是error，如果handler缺省且出现异常的话，异常会被抛到全局。

`func`函数也可以像下面这样调用:

```js
  co(function*(){
     let [err,data3] = yield func(1);
     if(err){
        console.log(err);
     }else{
        console.log(data3);
     }
   })();
```

 这段代码表明可以直接 yield `future`。


### 3. this.ctx

`this.ctx` 是线程本地存储（thread-local storage）的一个近似实现. 传统的多线程程序，一个线程处理一个用户请求，那么这个线程的全局变量对于这个用户来讲就是私有的，不被其他用户共享。 node是单线程的，一个线程可以处理很多用户的请求，显然该线程的全局变量可以被多个用户共享，`this.ctx` 为用户提供一个私有的全局上下文。

要解决的问题： 为一次事务提供全局唯一上下文。

__一个场景__：

一个用户发起了一个请求，并传递过来一个`trace_id`用来标识这次请求。为完成用户的这次请求，我们需要调用项目里面的多个模块，为了方便追踪和分析，希望每个模块的日志都带上这个`trace_id`。一种做法是将`trace_id`作为参数，传递给所有要调用的module。显然这种方法是不优雅的。

下面借助`this.ctx` 完美的实现这个需求,[点我看完整示例代码](https://github.com/yyrdl/zco_example/tree/master/this.ctx)：

```js
   //express 风格的router
   router.post("/api",function(req,res,next){
     co.brief(function*(){

        //从headers获得trace_id ，并将其赋到上下文上

        this.ctx.trace_id = req.headers.trace_id;

        //下面的代码代表实际生产中的业务操作
        let user_id = yield apis.findUserIdByUser(req.body.user);
        let phone_list = yield apis.findPhoneListByUserId(user_id);
        return phone_list;
     })(function(err,list){
        if(err){

           //从上下文获得trace_id，并添加到日志上
            log.error(err.stack,{"trace_id":this.ctx.trace_id});

            res.json({"success":false,"msg":"internal error!"});
        }else{

              //从上下文获得trace_id，并添加到日志上
            log.info("request success",{"trace_id":this.ctx.trace_id});

            res.json({"success":true,"phone_list":list});
        }
     })
   })
```
上面代码用到的apis模块的定义如下：

```js
 exports.findUserIdByUser=function(user){
    return co(function*(){
       let user_id=null;
       //...  省略号代表实际的操作，可能是数据库操作等
       //从上下文获得trace_id，并添加到日志上
       log.info("find user success",{"trace_id":this.ctx.trace_id});
       return user_id;
    });
 }

 exports.findPhoneListByUserId=function(user_id){
    return co(function*(){
        let phone_list=null;
        //...  省略号代表实际的操作，可能是数据库操作等
        //从上下文获得trace_id，并添加到日志上
        log.info("find phone_list success",{"trace_id":this.ctx.trace_id});
        return phone_list;
    });
}
```
上面代码表明`this.ctx`是共享的，在其他模块里也能访问到，实际上zco会依着函数调用链，将上下文传递下去.

__`this.ctx`的更多信息__：

zco 会自动传递上下文，当yield一个`future`时，会调用`future.__ctx__(this.ctx)` 传递上下文。那yield 普通的回调API呢？ 见下面的代码：

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

这段代码yield 是一个普通的回调风格的API,在回调函数里面可以通过调用`co_next.ctx()`访问上下文.

### 4. co_next 和 defer

`co_next` 在前面已经出现了多次，他是一个通用的回调函数，用来代替一些模块原本的回调函数，比如可以代替文件模块`fs.readFile`的回调函数，那么读文件可以写成`let [error,file] = yield fs.readFile(path,co_next)`。 `co_next` 将接收原本传给回调函数的数据 。

`defer` 提供了一个保证：由`defer`定义的操作在最后一定会被执行，并且不管代码有没有报错. 可以用来定义一些清理工作，比如`db.close()`。

__一个场景__:

假设需要访问github首页，并且需要控制访问并发数不会大于5。首先要写一个并发锁，然后在函数里使用这个并发锁控制并发数。代码可能会像下面这样：

```js
  mutex.lock();//持有锁
  //... 做一些事情
  //... 假设这儿可能会抛异常，比如`JSON.parse("{")`
  mutex.unLock();//释放锁
```
在释放锁之前可能出现异常，这样就不能保证锁一定会被释放，就会出现死锁的风险，代码会卡住。

用`defer`可以轻松解决这个问题:

```js
 co(function*(co_next,defer){
      defer(function*(){
         mutex.unLock();
      });

      mutex.lock();
     //... 做一些事情
     //... 假设这儿可能会抛异常，比如`JSON.parse("{")`
     // 即使抛异常了，也不会影响锁的释放
  })();
```
完整代码见[这儿](https://github.com/yyrdl/zco_example/tree/master/defer)

### 5. 连续的调用堆栈

我们都知道异步函数出现异常，抛出的error会丢失调用堆栈，这让查找问题变得困难。

下面是这个问题的一个演示代码：

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
打出的错误堆栈是：
```
SyntaxError: Unexpected end of JSON input
    at JSON.parse (<anonymous>)
    at Timeout._onTimeout (e:\GIT\test\zco.js:21:18)
    at ontimeout (timers.js:488:11)
    at tryOnTimeout (timers.js:323:5)
    at Timer.listOnTimeout (timers.js:283:5)
```

堆栈信息并没有显示出我们是在哪里调用的`middle_call_path`,在哪里调用的`async_func`.

用zco 重写上面的示例：
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
打出的堆栈信息为：
```
SyntaxError: Unexpected end of JSON input
    at JSON.parse (<anonymous>)
    at Object.<anonymous> (e:\GIT\test\zco.js:21:13)//调用 `JSON.parse`的地方
    at middle_call_path (e:\GIT\test\zco.js:25:12) //调用 `async_func`的地方
    at Object.<anonymous> (e:\GIT\test\zco.js:27:1)//调用`middle_call_path`的地方
```
我们得到了完整的函数调用路径，方便了去查找造成异常的原因。

[完整示例代码](https://github.com/yyrdl/zco_example/tree/master/consecutive_stack) （有回调版，zco版和co版）

### 6. zco.brief
zco 认为所有的操作都可能出错，所以 `handler`的第一个参数永远是error. 这样我们就能在异常刚开始出现的地方处理异常。 不同地方出现的异常具有不同的含义，处理方式也会有区别。 但有时候并不需要细粒度地去处理，这时候就可以使用`zco.brief`。

细粒度处理的方式：
```js
const co_func=function(i){
  return co(function*(){
     return 10*i;
  })
}

co(function  * () {
	let [err1, result1] = yield co_func(1);
	if (err1) {
		throw err1;//在这里只是将异常抛出，实际有可能是重试上面的操作
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
```
粗粒度地处理：
```js
co.brief(function*(){

   let result1 = yield co_func(1);//在这里只想要函数原本的返回结果

   let result2 = yield co_func(2);

   return result1+result2;

})((err,result)=>{
    if (err) {//如果有异常在最后统一处理
   		console.log(err);
   	} else {
   		console.log(result);
   	}
});
```

### 7. zco.timeLimit

这个方法可以为一个操作设置时间限制，超时未完成则抛出超时异常.

`zco.timeLimit(ms,future)`

例子：

```js
co.timeLimit(1 * 10, co(function  * (co_next) {
	yield setTimeout(co_next, 2 * 10);//等待 20毫秒,
}))((err) => {
	console.log(err.message); //"timeout"
})
```

### 8. zco.all

并发执行一系列操作

API： `zco.all(future...,[timeout setting])`;

例子：

```js
const co_func = function (a, b, c) {
	return co(function  * (co_next) {
	    yield setTimeout(co_next,10);//等待10毫秒
		return a+b+c;
	})
}

const generic_callback = function (callback) { //第一个参数必须是回调函数
	callback(100);
}

co(function  * () {
	let timeout = 10 * 1000; //超时时间
	let[err, result] = yield co.all(co_func(1, 2, 3), co_func(4, 5, 6),generic_callback,timeout); //支持设置超时时间

	console.log(err); //null
	console.log(result) //[6,15,[100]]
})()
```

### 9. 对于Promise

并不推荐使用Promise，但有时候会遇到.

```js
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

    带co前缀的都属于协程模块，在禁用栈跟踪的情况下测试zco。

    results for 20000 parallel executions, 1 ms per I/O op ,2017-06-03
     
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

    
    开启栈跟踪的测试结果：


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
