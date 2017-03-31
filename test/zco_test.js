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
   it("error should be throwed out if no handler instead of catching silently",function(){
	   let error=null;
	   try{
		 co(function *(next) {
           var a=yield sync_code_error(next);
           return 10;
         })();
	   }catch(e){
		   error=e;
	   }finally{
		   expect(error).to.not.equal(null);
	   }
   });
   
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

describe("throw error when not a generator function",function () {
     it("should throw error",function(){
         let error=undefined;
         try{
             co(function(){
                 var d=10;
                 return d;
             })();
         }catch (e){
             error=e;
         }finally {
             expect(error).to.not.equal(undefined);
             if(error){
                 expect(error.message).to.equal("the arg of co must be generator function");
             }
         }
     })
})

var fake_async_func=function(a,b,callback){
	callback(a+b);
}

describe("support fake async func",function(){
	it("should not throw error",function(){
		co(function*(next){
			let [d]=yield fake_async_func(1,2,next);
		})((err,data)=>{
			expect(err).to.equal(undefined);
			expect(data).to.equal(3);
		});
	})
})

describe("defer",function(){
	it("should run defer before return ",function(){
		 let record=[];
		 co(function*(next,defer){
			defer(function(){
				record.push(2);
			}) 
			let [d]=yield fake_async_func(1,2,next);
			record.push(1);
			return d;
		 })((err,d)=>{
			record.push(3);
		    expect(err).to.equal(undefined);
			expect(data).to.equal(3);
			expect(record).to.equal(record);
	     })
	})
})

 



