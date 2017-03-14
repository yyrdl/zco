/**
 * Created by yyrdl on 2017/3/14.
 */

var co=require("../../index");

var actions=require("../actions");

exports.run=function(commitor,cb){
    co(function*(run){
        var [err,userinfo]=yield  run(actions.getUserinfo);

        commitor.commit();

        var [err,list]=yield run(actions.articleList,userinfo.user);

        commitor.commit();

        yield run(actions.updateAge,23);

        commitor.commit();

        var [err,article]=yield run(actions.getArticle,list[0]);

        return article;

    })((err,art)=>{
        cb();
    })
}
