# zco

inspired by tj's [co](https://github.com/tj/co) , but work with no Promise, only callback.


# useage

```javascript
const co=require("zco");

var func=function(a,b,c,cb){
   setTimeout(function () {
       cb(a+b+c);
   },10);

}

function A(cb){
   return co(function*(run){

        var s=yield run(func,1,2,3);
        var b=yield run(func,2,3,4);


        console.log("S:"+s)
        console.log("B:"+b);

        return "hello world";

    })(cb);
}


co(function*(run){

    var [err,s]=yield run(A);

    console.log(s);
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