/**
 * Created by jason on 2017/3/15.
 */

var fs=require("fs");
var co=require("../index");


exports.fileList=function(dir,cb){

     co(function*(next){
        var files=[];
        var [err,list]=yield fs.readdir(dir,next);
        if(err){
            return files;
        }
        for(var i=0;i<list.length;i++){
            var [er,stat]=yield fs.stat(dir+"/"+list[i],next);
            if(!er&&stat.isFile()&&list[i].endsWith(".js")){
              files.push(list[i]);
            }
        }
        return files;
    })(cb)
}
