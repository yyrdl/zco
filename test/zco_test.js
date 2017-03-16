/**
 * Created by jason on 2017/3/16.
 */

var expect=require("chai").expect;

var co=require("../index");

var async_func1=function(callback){
    var error=undefined;
    setTimeout(function(){
        callback(error,"hello world");
    },10)
}

var async_func2=function(a,b,c,callback){
    setTimeout(function(){
        callback(a+b+c);
    },10)
}

var sync_code_error=function(callback){
    throw new Error("manual error");
    setTimeout(callback,0);
}


var people={
    "age":100,
    "say":function(callback){
        var self=this;
        setTimeout(function(){
            callback(self.age);
        },0)
    }
}


describe("normal use",function(){

   it("no args no callback",function(){
       co(function *(run) {
           var [err,str]=yield run(async_func1);
           expect(err).to.equal(undefined);
           expect(str).to.equal("hello world");
       })()
   })

   it("context delivery",function () {
       co(function*(run){
          var [age]=yield  run.call(people,people.say);
          expect(age).to.equal(100);
       })()
   });

   it("catch sync code error",function(){
       co(function *(run) {
           var a=yield run(sync_code_error);
           return 10;
       })(function(err,v){
           expect(err).to.not.equal(undefined);
       })
   })

   it("delivery return value",function(){
      co(function*(run){
         var [age]=yield run.call(people,people.say);
         return age;
      })(function(err,age){
          expect(err).to.equal(undefined);
          expect(age).to.equal(100);
      })
   })

});

var co_func1=function(a,b,c){
    return co(function *(run) {
        var [d]=yield run(async_func2,a,b,c);
        return d;
    })
}

var co_func2=function(a,b,c){
    return co(function*(run){
       var [err,data]=yield run(co_func1(a,b,c));
        return data;
    })
}

describe("co chain",function(){
    it("chain testing",function(){
        co(function*(run){
            var [err,d]=yield run(co_func2(1,2,3));
            expect(err).to.equal(undefined);
            return d;
        })(function(err,d){
            expect(err).to.equal(undefined);
            expect(d).to.equal(6);
        })
    })
})


