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
*  [Compare with tj's co,Promise, callback,and ES7 "async/await" when do samething](#comparison)


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
   

# Performance Battle

    results for 20000 parallel executions, 1 ms per I/O op ,2017-04-10

    name                                                      timecost(ms)     memery(mb)       
    callback.js                                               101              30.67578125
    async-neo@1.8.2.js                                        157              48.5703125
    promise_bluebird@2.11.0.js                                656              92.6328125
    co_zco_yyrdl@1.2.2.js                                     823              78.14453125
    async_caolan@1.5.2.js                                     1029             122.71484375
    co_when_generator_cujojs@3.7.8.js                         1063             117.79296875
    co_when_generator_cujojs_with_bluebird@3.7.8.js           1214             127.36328125
    co_tj_with_bluebird_promise@4.6.0.js                      1266             125.328125
    async_await_es7_with_native_promise.js                    1313             161.0859375
    promise_native.js                                         1327             178.01171875
    co_when_generator_cujojs_with_native_promise@3.7.8.js     1609             170.6953125
    co_tj_with_native_promise@4.6.0.js                        1640             163.78515625
    async_await_es7_with_bluebird_promise.js                  1684             197.69140625
    co_coroutine_bluebird@2.11.0.js                           4027             242.3828125
    


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
    console.log(err);//undefined
    console.log(str);//"hello world"

    let [err2,str2]=yield fake_async_func(next);
    console.log(err2);//undefined
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
    console.log(err);//undefined
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
    console.log(err);//undefined
    return d;
})((err,d)=>{
    console.log(err);//undefined
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


```
# Comparison

 Suppose we need to get  javascript file list in directory "./cases",let's write code to do it.

* [zco](#zco-style)
* [Tj's co](#tj-co-style)
* [Promise](#promise-style)
* [Callback](#callback-style)
* [ES7 Async/Await](#es7-asyncawait)


###  zco style

```javascript
  const zco=require("zco");
  const fs=require("fs");
  const testDirectory="./cases";

  let getAllJsFileZCOVersion=function(dirname){
      return zco(function*(next){
          let files=[];
          let [err,list]=yield fs.readdir(dirname,next);//get files list
          if(err){
             throw err;
          }
          for(var i=0;i<list.length;i++){
              var [er,stat]=yield fs.stat(dirname+"/"+list[i],next);
              if(er){
                 throw er;
              }else if(stat.isFile()&&list[i].endsWith(".js")){//judge if it is js file
                  files.push(list[i]);
              }
          }
          return files;
      });
  }

  //then use it

  getAllJsFileZCOVersion(testDirectory)((err,jsFiles)=>{
       if(err){
           console.log(err.message);
       }else{
           console.log(jsFiles);
       }
  });


```

# Tj co style

Similar useage with bluebird.coroutine and when/generator.

```javascript
 const co=require("co");
 const Promise=require("bluebird");
 const fs=require("fs");

 const testDirectory="./cases";

 //we need to convert callback to Promise
 let readdir=function(dirname){
     return new Promise((resolve,reject)=>{
         fs.readdir(dirname,(err,list)=>{
            if(err){
                reject(err);
            }else{
                resolve(list);
            }
         })
     })
 }
 let stat=function(file){
     return new Promise((resolve,reject)=>{
         fs.stat(file,(err,stats)=>{
             if(err){
                 reject(err);
             }else{
                 resolve(stats);
             }
         })
     });
 }

 let getAllJsFileTJCOVersion=function(dirname){
    return co(function*(){
        let list=yield readdir(dirname);
        let files=[];
        for(let i=0;i<list.length;i++){
            let stats=yield stat(dirname+"/"+list[i]);
            if(stats.isFile()&&list[i].endsWith(".js")){
                files.push(list[i]);
            }
        }
        return files;
    });
}

//then use it

 getAllJsFileTJCOVersion(testDirectory).then((files)=>{
    console.log(files);
 }).catch((err)=>{
    console.log(err);
 })
```

### Promise style

```javascript
 const Promise=require("bluebird");
 const fs=require("fs");

 const testDirectory="./cases";

 //we need to convert callback to Promise
 let readdir=function(dirname){
     return new Promise((resolve,reject)=>{
         fs.readdir(dirname,(err,list)=>{
            if(err){
                reject(err);
            }else{
                resolve(list);
            }
         })
     })
 }
 let stat=function(file){
     return new Promise((resolve,reject)=>{
         fs.stat(file,(err,stats)=>{
             if(err){
                 reject(err);
             }else{
                 resolve(stats);
             }
         })
     });
 }
 let getAllJsFilePurePromiseVersion=function (dirname) {
     return readdir(dirname).then((list)=>{
         let pros=[];
         for(let i=0;i<list.length;i++){
             pros.push(stat(dirname+"/"+list[i]));
         }
         return Promise.all(pros).then((statsList)=>{
             let files=[];
             for(let i=0;i<statsList.length;i++){
                 if(statsList[i].isFile()&&list[i].endsWith(".js")){
                     files.push(list[i]);
                 }
             }
             return files;
         });
     });
 }
 //then use it

 getAllJsFilePurePromiseVersion(testDirectory).then((files)=>{
     console.log(files);
 }).catch((err)=>{
     console.log(err);
 })
```

### Callback style

Callback is basic useage in node.js ,and has best performance!

```javascript

const fs=require("fs");

const testDirectory="./cases";

let getAllJsFilePureCallbackVersion=function(dirname,callback){
    let index=0,list=[],files=[];
    let alreadyReturn=false;
    let _end=function (err) {
        if(!alreadyReturn){
            alreadyReturn=true;
            err?callback(err):callback(undefined,files);
        }
    }
    let checkDone=function () {
        if(index===list.length){
            _end();
        }
    }
    let jsFile=function () {
        for(let i=0;i<list.length;i++){
            ((j)=>{
                fs.stat(dirname+"/"+list[j],(err,stats)=>{
                    if(err){
                        _end(err);
                    }else if(stats.isFile()&&list[j].endsWith(".js")){
                        files.push(list[j]);
                        index++;
                        checkDone();
                    }
                })
            })(i)
        }
    }
    fs.readdir(dirname,(err,_list)=>{
        if(err){
           _end(err);
        }else{
           list=_list;
            jsFile();
        }
    });
}

//then use it

getAllJsFilePureCallbackVersion(testDirectory,(err,files)=>{
    if(err){
        console.log(err);
    }else{
        console.log(files);
    }
})
```

###  ES7 Async/Await

```javascript
const fs=require("fs");
const testDirectory="./cases";

let readdir=function(dirname){
    return new Promise((resolve,reject)=>{
        fs.readdir(dirname,(err,list)=>{
           if(err){
               reject(err);
           }else{
               resolve(list);
           }
        })
    })
}
let stat=function(file){
    return new Promise((resolve,reject)=>{
        fs.stat(file,(err,stats)=>{
            if(err){
                reject(err);
            }else{
                resolve(stats);
            }
        })
    });
}
let getAllJsFileAsyncAwaitES7Version=async function (dirname) {
       let list=await  readdir(dirname);
       let files=[];
       for(let i=0;i<list.length;i++){
           let stats=await stat(dirname+"/"+list[i]);
           if(stats.isFile()&&list[i].endsWith(".js")){
               files.push(list[i]);
           }
       }
       return files;
}

 getAllJsFileAsyncAwaitES7Version(testDirectory).then((files)=>{
     console.log(files);
 }).catch((err)=>{
     console.log(err);
 })
```

For these five coding-style, if in consideration of performance,I will chose callback ,if not I will chose zco,because it is more
brief .


# License

MIT
