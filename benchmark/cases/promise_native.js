/**
 * Created by yyrdl on 2017/3/14.
 */

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
    getUserinfo().then(function(userinfo){
        return articleList(userinfo.user)
    }).then(function(list){
        return getArticle(list[0])
    }).then(function(a){
        return updateAge(23);
    }).then(function(){
        cb();
    })
}
