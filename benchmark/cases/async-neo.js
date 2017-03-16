/**
 * Created by jason on 2017/3/16.
 */
var async=require("neo-async");

var actions = require("../actions");

module.exports = function (stream, idOrPath, tag, cb) {
    async.waterfall([
        actions.getUserinfo,
        function (userinfo, callback) {
            actions.articleList(userinfo.user, callback);
        },
        function (list, callback) {
            actions.getArticle(list[0], callback);
        },
        function (articel,callback) {
            actions.updateAge(13, callback);
        }
    ], function (e) {
        cb();
    })
}