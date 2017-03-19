/**
 * Created by jason on 2017/3/16.
 */
const async = require('async');
const actions = require("../actions");

module.exports = function (stream, idOrPath, tag, cb) {
	async.waterfall([
			actions.getUserinfo,
			function (userinfo, callback) {
				actions.articleList(userinfo.user, callback);
			},
			function (list, callback) {
				actions.getArticle(list[0], callback);
			},
			function () {
				actions.updateAge(13, cb);
			}
		], function (e) {
		cb();
	})
}
