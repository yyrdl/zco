/**
 * Created by yyrdl on 2017/3/14.
 */
const actions=require("../actions");

module.exports=function(stream,idOrPath,tag,cb){
    actions.getUserinfo(function(err,userinfo){
      actions.articleList(userinfo.user,function(err,list){
          actions.updateAge(23,function () {
              actions.getArticle(list[0],function () {
                  cb();
              })
          })
      });
    })
}