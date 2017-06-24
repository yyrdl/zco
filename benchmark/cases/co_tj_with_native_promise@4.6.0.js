/**
 * Created by yyrdl on 2017/3/14.
 */

const co=require("co");
const actions=require("../actions");
const util=require("../util");

const getUserinfo=util.promisify(actions,actions.getUserinfo,Promise);

const articleList=util.promisify(actions,actions.articleList,Promise);

const getArticle=util.promisify(actions,actions.getArticle,Promise);

const updateAge=util.promisify(actions,actions.updateAge,Promise);


module.exports=function(stream,idOrPath,tag,cb){
    co(function*(){
        var userinfo=yield getUserinfo() ;

        var list=yield articleList(userinfo.user);

        yield updateAge(23);

        var article=yield getArticle(list[0]);

        return article;

    }).then((art)=>{
        cb();
    }).catch((err)=>{
        cb();
    })
}
