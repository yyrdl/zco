
var fs=require("fs");
var co=require("./index");


exports.fileList=function(dir,cb){
    co(function*(run){
        var files=[];
        var [err,list]=yield run(fs.readdir,dir);
        if(err){
            return files;
        }
        for(var i=0;i<list.length;i++){
            var [er,stat]=yield run(fs.stat,dir+"/"+list[i]);
            if(!er&&stat.isFile()&&list[i].endsWith(".js")){
                files.push(list[i]);
            }
        }
        return files;
    })(cb)
}

exports.fileList("./",function(err,list){
    if(err){
        console.error(err.stack);
    }else{
        console.log(list);
    }
})