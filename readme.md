[test_status_url]:https://travis-ci.org/yyrdl/zco.svg?branch=master
[coverage_status_url]:https://coveralls.io/repos/github/yyrdl/zco/badge.svg?branch=master
[coverage_page]:https://coveralls.io/github/yyrdl/zco?branch=master

# ZCO ![build status][test_status_url] [![Coverage Status][coverage_status_url]][coverage_page]

Generator based control flow,inspired by tj's [co](https://github.com/tj/co) , but work with no Promise, only callback,even if it is not a asynchronous operation.

Recommend version of node.js(or iojs)  which support the destructuring assignment syntax.


# Table Of Contents

*  [Why zco](#why-zco)
*  [Performance Battle](#performance-battle)
*  [Useage](#useage)
*  [Example](#example)
*  [Compare with tj's co,Promise, callback,and ES7 "async/await" when do samething](#comparison)


# Why zco?

   The majority of operations in node.js(or webside) is based on callback,people convert callback-style-code to Promise-style-code(or other style)
in order to making control-flow clearly.But it is not good enough,we want to writing sync-style-code,and we have created some modules
that allow us writing sync-style-code.

   Many other modules require a Promise  returned by expression after `yield`,it's not necessary if we just want a clear control-flow.
__zco__ only work with callback,do less operation and has good performance among these coroutine modules(see performance statistics below).

# Performance Battle

    results for 20000 parallel executions, 1 ms per I/O op ,2017-03-20

    name                                                      timecost(ms)     memery(mb)       
	callback.js                                               81               30.28125         
	async-neo@1.8.2.js                                        139              48.16015625      
	promise_bluebird@2.11.0.js                                349              59.38671875      
	co_zco_yyrdl@1.2.0.js                                     550              81.33984375      
	async_caolan@1.5.2.js                                     704              121.609375       
	co_when_generator_cujojs@3.7.8.js                         719              115.7734375      
	co_tj_with_bluebird_promise@4.6.0.js                      889              131.6953125      
	co_when_generator_cujojs_with_bluebird@3.7.8.js           920              136.59375        
	promise_native.js                                         959              178.76953125     
	async_await_es7_with_native_promise.js                    988              168.39453125     
	co_tj_with_native_promise@4.6.0.js                        1068             163.4375         
	co_when_generator_cujojs_with_native_promise@3.7.8.js     1087             173.23046875     
	async_await_es7_with_bluebird_promise.js                  1154             189.4453125      
	co_coroutine_bluebird@2.11.0.js                           4251             255.34765625     


    Platform info:
    Windows_NT 10.0.14393 x64
    Node.JS 7.7.3
    V8 5.5.372.41
    Intel(R) Core(TM) i5-5200U CPU @ 2.20GHz × 4

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
    callback(error,"hello world");
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
/*************************co chain**************************************/

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
        let [err,data]=yield co_func1(a,b,c)(next);
        return data;
    })
}

co(function*(next){
    let [err,d]=yield co_func2(1,2,3)(next);
    console.log(err);//undefined
    return d;
})((err,d)=>{
    console.log(err);//undefined
    console.log(d);//6
})

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
brief and has good performance.


# License

MIT
