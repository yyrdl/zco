/**
 * Created by yyrdl on 2017/3/14.
 */

var co=require("../../index");

var actions=require("../actions");

module.exports=function(stream,idOrPath,tag,cb){
    co(function*(run){
        var [err,userinfo]=yield  run(actions.getUserinfo);

        var [err,list]=yield run(actions.articleList,userinfo.user);

        yield run(actions.updateAge,23);

        var [err,article]=yield run(actions.getArticle,list[0]);

        return article;

    })((err,art)=>{
        cb();
    })
}
