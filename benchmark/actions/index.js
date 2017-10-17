/**
 * Created by yyrdl on 2017/3/14.
 */

var userinfo={
    "user":"yyrdl",
    "age":24,
    "from":"china"
}
var articelList=["a1","a2"];

exports.getUserinfo=function (cb) {

    var error=undefined;
    setTimeout(function(){
        cb(error,userinfo);
    },1);
}

exports.updateAge=function (new_age,cb) {
    setTimeout(function(){
         userinfo.age=new_age;
         cb();
    },1)
}
exports.articleList=function(username,cb){
    var error=undefined;
    setTimeout(function () {

      cb(error,articelList);
    },1);
}

exports.getArticle=function(n,cb){
    var error=undefined;
    setTimeout(function () {
        cb(error,"hello world!");
    },1);
};