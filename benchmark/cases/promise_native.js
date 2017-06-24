/**
 * Created by yyrdl on 2017/3/14.
 */

const  actions=require("../actions");
const util=require("../util");

const getUserinfo=util.promisify(actions,actions.getUserinfo,Promise);

const articleList=util.promisify(actions,actions.articleList,Promise);

const getArticle=util.promisify(actions,actions.getArticle,Promise);

const updateAge=util.promisify(actions,actions.updateAge,Promise);

module.exports=function(stream,idOrPath,tag,cb){
    getUserinfo().then(function(userinfo){
        return articleList(userinfo.user)
    }).then(function(list){
        return getArticle(list[0])
    }).then(function(a){
        return updateAge(23);
    }).then(function(){
        cb();
    }).catch((err)=>{
        cb();
    })
}
