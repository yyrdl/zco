
# zco ![build status](https://travis-ci.org/yyrdl/zco.svg?branch=master)

generator based control flow,inspired by tj's [co](https://github.com/tj/co) , but work with no Promise, only callback.

recommend version of node.js(or iojs)  which support the destructuring assignment syntax.

# why zco?

   The majority of operations in node.js(or webside) is based on callback,people convert callback-style-code to Promise-style-code(or other style)
in order to making control-flow clearly.But it is not good enough,we want to writing sync-style-code,and we have created some modules
that allow us writing sync-style-code.

   Many other modules require a Promise object returned by expression after `yield`,it's not necessary if we just want a clear control-flow.
__zco__ only work with callback,do less operation and has good performance among these coroutine modules(see performance statistics below).

# performance battle

    results for 20000 parallel executions, 1 ms per I/O op ,2017-03-16

    name                                            timecost(ms)     memery(mb)
    callback.js                                     125              30.55078125
    async-neo.js@1.8.2                              258              51.69140625
    promise_bluebird.js@2.11.0                      424              68.74609375
    co_when_cujojs.js@3.7.8                         966              100.9296875
    co_yyrdl.js@1.1.0                               1005             76.94140625
    async_caolan.js@1.5.2                           1007             122.41015625
    co_tj_with_bluebird_promise.js@4.6.0            1390             114.3125
    co_when_cujojs_with_bluebird.js@4.6.0           1391             125.3359375
    promise_native.js                               1648             191
    co_when_cujojs_with_native_promise.js           1972             153.39453125
    co_tj_with_native_promise.js@4.6.0              2330             170.40625
    co_bluebird.js@2.11.0                           4184             139.48046875


    Platform info:
    Windows_NT 10.0.14393 x64
    Node.JS 6.10.0
    V8 5.1.281.93
    Intel(R) Core(TM) i5-3210M CPU @ 2.50GHz × 4

# useage

	npm install zco

# example

```javascript

const co=require("zco");


let async_func1=function(callback){
    let error=undefined;
    setTimeout(()=>{
        callback(error,"hello world");
    },10)
}

/*****************************simple use***************************/
co(function *(run) {
    let [err,str]=yield run(async_func1);
    console.log(err);//undefined
    console.log(str);//"hello world"
})()

/*************************delivery context*************************/

let people={
    "age":100,
    "say":function(callback){
        var self=this;
        setTimeout(function(){
            callback(self.age);
        },0)
    }
}

co(function*(run){
    let [age]=yield  run.call(people,people.say);//delivery context
    console.log(age);//100
})()

/************************catch  error*********************************/

let sync_code_error=function(callback){
    throw new Error("manual error");
    setTimeout(callback,0);
}

co(function *(run) {
    let a=yield run(sync_code_error);
    return 10;
})((err,v)=>{
    console.log(err.message);//"manual error"
})

/**************************delivery return-value***********************/

co(function*(run){
    var [age]=yield run.call(people,people.say);
    return age;
})((err,age)=>{
    console.log(err);//undefined
    console.log(age);//100
})
/*************************co chain**************************************/

let async_func2=function(a,b,c,callback){
    setTimeout(()=>{
        callback(a+b+c);
    },10)
}

let co_func1=function(a,b,c){
    return co(function *(run) {
        let [d]=yield run(async_func2,a,b,c);
        return d;
    })
}

let co_func2=function(a,b,c){
    return co(function*(run){
        let [err,data]=yield run(co_func1(a,b,c));
        return data;
    })
}

co(function*(run){
    let [err,d]=yield run(co_func2(1,2,3));
    console.log(err);//undefined
    return d;
})((err,d)=>{
    console.log(err);//undefined
    console.log(d);//6
})

```
# import

```javascript
let real_async_func=function(a,b,callback){//the last arg must be callback ,import!
    setTimeout(function(){
       callback(a+b);
    },10)
}

let sync_code=function(callback){
    callback("hello world");
}

co(function*(run){
   let [result]=yield run(real_async_func,1,2);
   console.log(result);//3
   let [str]=yield run(sync_code);//this code will make error,because it is not real-async operation,import!
   console.log(str);
})();

```

# License

MIT