var co=require("./");
var fs=require("fs");

co(function*(next,defer){
	 
	var [err,stat]=yield fs.stat("./index.js",next);
	console.log(stat.size);
})()