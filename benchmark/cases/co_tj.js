/**
 * Created by yyrdl on 2017/3/14.
 */

var co=require("co");


var actions=require("../actions");

//需要将回调包装成 promsie,convert callback  to promise

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

exports.run=function(commitor,cb){
    co(function*(){
        var userinfo=yield getUserinfo() ;

        commitor.commit();

        var list=yield articleList(userinfo.user);

        commitor.commit();

        yield updateAge(23);

        commitor.commit();

        var article=yield getArticle(list[0]);

        return article;

    }).then((err,art)=>{
        cb();
    })
}
