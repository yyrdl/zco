/**
 * Created by yyrdl on 2017/3/14.
 */
var actions=require("../actions");

exports.run=function(commitor,done){
    actions.getUserinfo(function(err,userinfo){
      commitor.commit();
      actions.articleList(userinfo.user,function(err,list){
        commitor.commit();
          actions.updateAge(23,function () {
              commitor.commit();
              actions.getArticle(list[0],function () {
                  done();
              })
          })
      });
    })
}