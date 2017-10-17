/**
 * Created by jason on 2017/3/16.
 */
const cc=require("cc_co");

const actions = require("../actions");

module.exports = function (stream, idOrPath, tag, cb) {
	cc(function(exec,ctx,resume){

		exec.async(actions.getUserinfo).assign("userinfo")(resume);
		
		exec(function(){
			exec.async(actions.articleList).assign("list")(ctx.userinfo.user,resume);
		});
		
		exec(function(){
			exec.async(actions.getArticle).assign("articel")(ctx.list[0],resume);
		});
		

		exec.async(actions.updateAge)(13,resume);

		
	})(function(){
		cb();
	});
  
};