[test_status_url]:https://travis-ci.org/yyrdl/zco.svg?branch=master
[coverage_status_url]:https://coveralls.io/repos/github/yyrdl/zco/badge.svg?branch=master
[coverage_page]:https://coveralls.io/github/yyrdl/zco?branch=master

# ZCO ![build status][test_status_url] [![Coverage Status][coverage_status_url]][coverage_page]

Generator based control flow,inspired by tj's [co](https://github.com/tj/co) , but more brief and has better performance.

Recommend versions of node.js(or iojs)  which support the destructuring assignment syntax.


# Table Of Contents

*  [Why zco](#why-zco)
*  [Performance Battle](#performance-battle)
*  [Useage](#useage)
*  [Example](#example)
*  [Compare with tj's co,Promise, callback,and ES7 "async/await" when do samething](https://github.com/yyrdl/zco/blob/master/readmes/compare.md)


# Why zco?

   Most of asynchronous operations in node.js are based on callback ,people convert callback-style-code to Promise-style-code
 for a clear control-flow. And other coroutine modules do the same thing,but many of them require a Promise returned by the expression after `yield`.Promise is not necessary,and in order to use these coroutine module ,you have to do more to wrap callback api.
 
   __zco__ is designed to work with callback seamlessly,do less operation,has better performance and a more brief code .Features of zco(some are special):
   * __defer__ like in golang ,`defer` define an operation that will be executed before the coroutine exit.
   * __plural return value__   code like this `let [value1,value2,value3]=yield func(next)`
   * __working with callback seamlessly__  no need to wrap
   * __support fake asynchronous operation__  zco will check if it is real-async,this feature avoid error: "Generator is already running"
   * __error catch__  different with Promise,if no handler is provided ,the error will be throwed out
   * __zco nest__ 
   * __zco.all__
   * __yield Promise__  not recommend,but also support
   

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

```javascript

const co=require("zco");


let async_func1=function(callback){
    let error=undefined;
    setTimeout(()=>{
        callback(error,"hello world");
    },10)
}
let fake_async_func=function(callback){//support operation that is not an real-async action
    callback(undefined,"hello world");
}

/*****************************simple use***************************/
co(function *(next) {
    let [err,str]=yield async_func1(next);
    console.log(err);//null
    console.log(str);//"hello world"

    let [err2,str2]=yield fake_async_func(next);
    console.log(err2);//null
    console.log(str2);//"hello world"
})()

/*************************defer *******************************/
//define a resource ,that should be released after use;
let resource={
   "referenceCount":0
}

let getResource=function(){
   resource.referenceCount+=1;
   return resource;
}
let releseResource=function(resour){
    resour&&(resour.referenceCount--);
}

co(function*(next,defer){
    let resour=null;
    defer(function*(inner_next){//the arg of defer must be a generator function
	  releseResource(resour);//we should release the resource after use
	});
	resour=getResource();
	//..........
})();

/************************catch  error*********************************/

let sync_code_error=function(callback){
    throw new Error("manual error");
    setTimeout(callback,0);
}

co(function *(next) {
    let a=yield sync_code_error(next);
    return 10;
})((err,v)=>{
    console.log(err.message);//"manual error"
})

/**************************delivery return-value***********************/

let people={
    "age":100,
    "say":function(callback){
        var self=this;
        setTimeout(function(){
            callback(self.age);
        },0)
    }
}

co(function*(next){
    var [age]=yield people.say(next);
    return age;
})((err,age)=>{
    console.log(err);//null
    console.log(age);//100
})
/*************************co nest**************************************/

let async_func2=function(a,b,c,callback){
    setTimeout(()=>{
        callback(a+b+c);
    },10)
}

let co_func1=function(a,b,c){
    return co(function *(next) {
        let [d]=yield async_func2(a,b,c,next);
        return d;
    })
}

let co_func2=function(a,b,c){
    return co(function*(next){

        let [err,data]=yield co_func1(a,b,c);

        //or "let [err,data]=yield co_func1(a,b,c)(next)", this  is also ok.

        return data;
    })
}

co(function*(next){
    let [err,d]=yield co_func2(1,2,3);
    console.log(err);//null
    return d;
})((err,d)=>{
    console.log(err);//null
    console.log(d);//6
})


/**********************************co all************************************/


let async_func2=function(a,b,c,callback){
    setTimeout(()=>{
        callback(a+b+c);
    },10)
}

let co_func1=function(a,b,c){
    return co(function *(next) {
        let [d]=yield async_func2(a,b,c,next);
        return d;
    })
}


let co_func2=function(a,b,c){
    return co(function *(next) {
        let [d]=yield async_func2(a,b,c,next);
        return d;
    })
}

let generic_callback=function(callback){//the first arg must be callback
     callback(100);
}

co(function*(next){
   let timeout=10*1000;//timeout setting
   let [err,result]=yield co.all(co_func1(1,2,3),co_func2(4,5,6),generic_callback,timeout);

   console.log(err);//null
   console.log(result)//[6,15,[100]]
})()

/***********************when there are Promise***********************************/

// even if not recommend Promise ,sometimes we can't bypass.


let promise_api=function(a,b){
  return Promise.resolve().then(function(){
     return a+b;
  });
}

co(function*(next){
   let [err,data]=yield promise_api(1,2);
   console.log(err);//null
   console.log(data)://3;
})()

```




# License

MIT
