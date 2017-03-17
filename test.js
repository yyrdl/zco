/**
 * Created by jason on 2017/3/17.
 */
var co=require("./index");

var async_func1=function(callback){
    var error=undefined;
    setTimeout(function(){
        callback(error,"hello world");
    },10)
}
//
// co(function *(next) {
//     var [err,str]= yield async_func1(next);
//     console.log(err);
//     console.log(str);
//
//     return 10;
// })((err,d)=>{
//     console.log(err.message);
//     console.log(d);
// })

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