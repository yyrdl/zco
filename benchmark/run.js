

const util=require("./util");
const fs=require("fs");
const path = require('path');
const exec=require("child_process").exec;

const nodeVersion=parseInt(process.versions.node.split(".")[0]);

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

var blank=function(num){
    var str="";
    for(var i=0;i<num;i++){
        str+=" ";
    }
    return str;
}
var write=function(measureStats){
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

var writeReport=function () {
    fs.readFile("./report.txt",function(err,data){
        if(err){
            console.log(err);
        }else{
           data=data.toString();
           var items=data.split(";");
           var measureStat=[];
           for(var i=0;i<items.length;i++){
               if(items[i].length>5){
                   var p=items[i].split(",");
                   measureStat.push(p);
               }
           }
            write(measureStat);
        }
    })
}

var  run=function(moduleDirs,times){
    var __path=path.join(__dirname,moduleDirs);
    util.fileList(__path,function(err,files){
        var index=0
        var cb=function () {
            index++;
            if(index<files.length){
                judgeNodeVersion();
            }else{
                writeReport();
            }

        }
        var judgeNodeVersion=function () {
            if(files[index].indexOf("es7")>-1){
               if(nodeVersion>6){
                   doMeasure()
               }else{
                   console.log(files[index]+"  require es7 feature,your node version doesn't support,skiped!");
                   cb();
               }
            }else{
                doMeasure();
            }
        }
        var doMeasure=function(){

            var m=path.join(__path,files[index]);
            console.log("start measure "+files[index]);
            var proc=exec("node do.js --m "+m+"  --n "+files[index]+"  --t "+times,{
                "cwd":__dirname
            },function(err,stdout,stderr){

            })
            proc.on("exit",function(){
              cb();
            });
            proc.stdout.on("data",function(d){
                console.log(d.toString());
            })
        }
        fs.writeFile("./report.txt"," ",function () {
            judgeNodeVersion();
        })
    })
}

printPlatform();

run("./cases",20000);
