

var util=require("./util");
var fs=require("fs");
var path = require('path');


function printPlatform() {
    console.log("\nPlatform info:");
    var os = require("os");
    var v8 = process.versions.v8;
    var node = process.versions.node;
    var plat = os.type() + " " + os.release() + " " + os.arch() + "\nNode.JS " + node + "\nV8 " + v8;
    var cpus = os.cpus().map(function(cpu){
        return cpu.model;
    }).reduce(function(o, model){
        if( !o[model] ) o[model] = 0;
        o[model]++;
        return o;
    }, {});
    cpus = Object.keys(cpus).map(function( key ){
        return key + " \u00d7 " + cpus[key];
    }).join("\n");
    console.log(plat + "\n" + cpus + "\n");
}

var measure=function(fn,times,callback){

    var start = Date.now();

    var warmedUp = 0;
    var tot =  Math.min( 350, times );
    for (var k = 0, kn = tot; k < kn; ++k)
        fn(k,'b','c', warmup);

    var memMax; var memStart; var start;

    function cb () {

        memMax = Math.max(memMax, process.memoryUsage().rss);
        if (!--times) {
            fn.end && fn.end();
            callback(null, {
                time: Date.now() - start,
                mem: (memMax - memStart)/1024/1024
            });
        }
    }
    function warmup() {
        warmedUp++
        if( warmedUp === tot ) {
            start = Date.now();

            memStart = process.memoryUsage().rss;
            for (var k = 0, kn = times; k < kn; ++k) {
                fn(k, 'b', 'c', cb);
            }
            memMax = process.memoryUsage().rss;
        }
    }
}
var measureStats=[];

var blank=function(num){
    var str="";
    for(var i=0;i<num;i++){
        str+=" ";
    }
    return str;
}
var writeReport=function(){
    var len=[];
    measureStats=measureStats.sort(function(a,b){
        return parseInt(a[1])>parseInt(b[1])?1:-1;
    });

    measureStats.unshift(["name","timecost(ms)","memery(mb)"]);
    
    for(var i=0;i<measureStats[0].length;i++){
        var l=0;
        for(var j=0;j<measureStats.length;j++){
            var str=measureStats[j][i]+"";
            l=str.length>l?str.length:l;
        }
        len.push(l);
    }

    var lines="";
    for(var i=0;i<measureStats.length;i++){
        for(var j=0;j<measureStats[i].length;j++){
            lines+=measureStats[i][j]+blank(len[j]-measureStats[i][j].length+5);
        }
        lines+="\n";
    }
     console.log("\n"+lines);
     fs.writeFile("./report.txt",lines,function () {
         
     })
}
var calmdown=function (func) {
    setTimeout(function(){
        func();
    },10000)
}
var  run=function(moduleDirs,times){
     times=times||50;
     var __path=path.join(__dirname,moduleDirs);
     util.fileList(__path,function(err,files){
         var index=0;
         var cb=function(er,reportData){
		    
             measureStats.push([files[index]+"",reportData.time+"",reportData.mem+""]);
             index++;
             if(index==files.length){
                 writeReport();
                 console.log("all case done");
             }else{
               calmdown(function(){
                   doMeasure();
               })
             }
         }
         var doMeasure=function(){
             console.log("start measure "+files[index]);
             var fn=require(path.join(__path,files[index]));

             measure(fn,times,cb)
         }
         doMeasure();
     })
}

printPlatform();

run("./cases",20000);
