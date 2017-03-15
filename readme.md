# zco

inspired by tj's [co](https://github.com/tj/co) , but work with no Promise, only callback.


# useage

	npm install zco


```javascript
const co=require("zco");

var func=function(a,b,c,cb){//the last arg must be callback
   setTimeout(function () {
       cb(a+b+c);
   },10);

}

function test_f(cb){//the last arg must be callback
   return co(function*(run){

        var s=yield run(func,1,2,3);
        var b=yield run(func,2,3,4);


        console.log("S:"+s)
        console.log("B:"+b);

        return "hello world";

    })(cb);
}


co(function*(run){

    var [err,s]=yield run(test_f);
    if(err){
	  //do something
	}else{
	 console.log(s);
	}

    return "done";

})(function(err,res){
    if(err){
        console.log("handle error mannually");
        console.log(err);
    }else{
        console.log("res:"+res);
    }
})

```
