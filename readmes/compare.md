# Comparison


 Suppose we need the list of js file in directory "./cases",let's write code to do it.


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