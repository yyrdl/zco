/**
 * Created by jason on 2017/3/19.
 */

const Promise=require("bluebird");
const actions=require("../actions");

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

module.exports=function(stream,idOrPath,tag,cb){
    (async ()=>{
        var userinfo=await getUserinfo() ;

        var list=await articleList(userinfo.user);

        await updateAge(23);

        var article=await getArticle(list[0]);

        return article;

    })().then(()=>{
        cb()
    }).catch((err)=>{
     cb()
    })
};










