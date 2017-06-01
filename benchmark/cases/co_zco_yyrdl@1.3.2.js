/**
 * Created by yyrdl on 2017/3/14.
 */

const co=require("../../index");

co.__TrackCallStack(false);

const actions=require("../actions");

module.exports=function(stream,idOrPath,tag,cb){
    co(function*(next){
        var [err,userinfo]=yield  actions.getUserinfo(next);

        var [err,list]=yield actions.articleList(userinfo.user,next);

        yield actions.updateAge(23,next);

        var [err,article]=yield actions.getArticle(list[0],next);

        return article;

    })((err,art)=>{
        cb();
    })
}
