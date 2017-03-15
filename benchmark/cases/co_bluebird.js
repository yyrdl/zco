/**
 * Created by yyrdl on 2017/3/14.
 */

var  Promise=require("bluebird");
var  actions=require("../actions");

let getUserinfo=function(){
    return new Promise((resolve,reject)=>{
        actions.getUserinfo(function(err,info){
            if(err){
                reject(err);
            }else{
                resolve(info);
            }
        });
    });
}

let articleList=function(user){
    return new Promise((resolve,reject)=>{
        actions.articleList(user,function(err,list){
            if(err){
                reject(err);
            }else{
                resolve(list);
            }
        });
    });
}


let getArticle=function(arti){
    return new Promise((resolve,reject)=>{
        actions.getArticle(arti,function(err,article){
            if(err){
                reject(err);
            }else{
                resolve(article);
            }
        });
    });
}



let updateAge=function(age){
    return new Promise((resolve,reject)=>{
        actions.updateAge(age,function(err){
            if(err){
                reject(err);
            }else{
                resolve();
            }
        });
    });
}
module.exports=function(stream,idOrPath,tag,cb){
    Promise.coroutine(function*(){
        var userinfo=yield getUserinfo() ;

        var list=yield articleList(userinfo.user);
        yield updateAge(23);

        var article=yield getArticle(list[0]);

        return article;
    })().then(cb);

}
 