/**
 * Created by jason on 2017/3/16.
 */
const co = require('when/generator');
const actions=require("../actions");
const Promise=require("bluebird");
const util=require("../util");

const getUserinfo=util.promisify(actions,actions.getUserinfo,Promise);

const articleList=util.promisify(actions,actions.articleList,Promise);

const getArticle=util.promisify(actions,actions.getArticle,Promise);

const updateAge=util.promisify(actions,actions.updateAge,Promise);


module.exports=function (a,b,c,callback) {

    co.call(function*() {
        var userinfo=yield getUserinfo() ;

        var list=yield articleList(userinfo.user);

        yield updateAge(23);

        var article=yield getArticle(list[0]);

        return article;

    }).then(callback).catch((err)=>{
        callback();
    });
}

