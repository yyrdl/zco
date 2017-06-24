/**
 * Created by jason on 2017/3/19.
 */

const Promise=require("bluebird");
const actions=require("../actions");
const util=require("../util");


const getUserinfo=util.promisify(actions,actions.getUserinfo,Promise);

const articleList=util.promisify(actions,actions.articleList,Promise);

const getArticle=util.promisify(actions,actions.getArticle,Promise);

const updateAge=util.promisify(actions,actions.updateAge,Promise);


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






