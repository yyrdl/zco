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
       co(function *(next) {
           var [err,str]=yield async_func1(next);
           expect(err).to.equal(undefined);
           expect(str).to.equal("hello world");
       })()
   })

   it("context test",function () {
       co(function*(next){
          var [age]=yield  people.say(next);
          expect(age).to.equal(100);
       })()
   });

   it("catch sync code error1",function(){
       co(function *(next) {
           var a=yield sync_code_error(next);
           return 10;
       })(function(err,v){
           expect(err).to.not.equal(undefined);
       })
   })
   
   it("catch sync code error2",function(){
       co(function *(next) {
           var a=yield async_func1(next);
		   throw new Error("manual error");
           return 10;
       })(function(err,v){
           expect(err).to.not.equal(undefined);
       })
   })

   it("delivery return value",function(){
      co(function*(next){
         var [age]=yield people.say(next);
         return age;
      })(function(err,age){
          expect(err).to.equal(undefined);
          expect(age).to.equal(100);
      })
   })

});

var co_func1=function(a,b,c){
    return co(function *(next) {
        var [d]=yield async_func2(a,b,c,next);
        return d;
    })
}

var co_func2=function(a,b,c){
    return co(function*(next){
        var [err,data]=yield co_func1(a,b,c)(next);
        return data;
    })
}

describe("co chain",function(){
    it("chain testing",function(){
        co(function*(next){
            var [err,d]=yield co_func2(1,2,3)(next);
            expect(err).to.equal(undefined);
            return d;
        })(function(err,d){
            expect(err).to.equal(undefined);
            expect(d).to.equal(6);
        })
    })
})


