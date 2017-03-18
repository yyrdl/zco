
# ZCO ![build status](https://travis-ci.org/yyrdl/zco.svg?branch=master)

Generator based control flow,inspired by tj's [co](https://github.com/tj/co) , but work with no Promise, only callback.

Recommend version of node.js(or iojs)  which support the destructuring assignment syntax.


# Table Of Contents

*  [Why zco](#-why-zco)
*  [Performance Battle](#-performance-battle)
*  [Useage](#-useage)
*  [Example](#-example)
*  [Compare with tj's co,Promise,and callback when do samething](#-compare)
*  [Important](#-important)


# Why zco?

   The majority of operations in node.js(or webside) is based on callback,people convert callback-style-code to Promise-style-code(or other style)
in order to making control-flow clearly.But it is not good enough,we want to writing sync-style-code,and we have created some modules
that allow us writing sync-style-code.

   Many other modules require a Promise  returned by expression after `yield`,it's not necessary if we just want a clear control-flow.
__zco__ only work with callback,do less operation and has good performance among these coroutine modules(see performance statistics below).

# Performance Battle

    results for 20000 parallel executions, 1 ms per I/O op ,2017-03-17

    name                                          timecost(ms)     memery(mb)
    callback.js                                   128              31.33984375
    async-neo.js@1.8.2                            261              51.6875
    promise_bluebird.js@2.11.0                    396              68.75
    co_yyrdl.js@1.2.0                             863              76.57421875
    co_when_cujojs.js@3.7.8                       928              101.078125
    async_caolan.js@1.5.2                         996              122.52734375
    co_tj_with_bluebird_promise.js@4.6.0          1206             113.9609375
    co_when_cujojs_with_bluebird.js@3.7.8         1242             120.796875
    promise_native.js                             1536             187.37890625
    co_when_cujojs_with_native_promise.js@3.7.8   1866             154.21484375
    co_tj_with_native_promise.js@4.6.0            2022             187.28515625
    co_bluebird.js@2.11.0                         4066             142.3671875

    Platform info:
    Windows_NT 10.0.14393 x64
    Node.JS 6.10.0
    V8 5.1.281.93
    Intel(R) Core(TM) i5-3210M CPU @ 2.50GHz × 4

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

/*****************************simple use***************************/
co(function *(next) {
    let [err,str]=yield async_func1(next);
    console.log(err);//undefined
    console.log(str);//"hello world"
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
# Compare

 Suppose we need to get  javascript file list in directory "./cases",let's write code to do it.


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
  zco(function*(next){
     var [err,jsFiles]=yield getAllJsFileZCOVersion(testDirectory)(next);
     if(err){
         console.log(err.message);
     }else{
         console.log(jsFiles);
     }
  })();
```

# Tj co style

similar with bluebird.corountin and when/generator

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

For these four coding-style, if in consideration of performance,I will chose callback ,if not I will chose zco,because it is more
brief and has good performance.

# Import!

```javascript

let real_async_func=function(a,b,callback){//the last arg must be callback ,import!
    setTimeout(function(){
        callback(a+b);
    },10)
}

let sync_code=function(callback){
    callback("hello world");
}

co(function*(next){
    let [result]=yield real_async_func(1,2,next);
    console.log(result);//3
    let [str]=yield sync_code(next);//this code will make error,because it is not real-async operation,import!
    console.log(str);
})((err,d)=>{
   if(err){
       console.log(err.message);//"Generator is already running"
   }else{
       console.log(d);
   }
});

```

# License

MIT