/**
 * Created by yyrdl on 2017/3/14.
 */

const TEST_RUN_TIME=1000;
const fs=require("fs");

let report=function(mod,timecost,memeryUse,cb){
    fs.appendFile("./report.txt",mod+"  "+timecost+"   0"+memeryUse,function(){
       cb();
    })
}

let run=function(cases){//module test case
    let hasRun=0;
    let index=0;
    let memMax=0,memStart=0;
    let startime=0,endTime=0;
    let memUse=0,timecost=0;
    let cb=function(){
        endTime=Date.now();
        hasRun++;
        var rss=process.memoryUsage().rss;
        if(rss>memMax){
            memMax=rss;
        }
        timecost+=endTime-startime;
        memUse+=Math.abs(memMax-memStart);

        endTime=0;
        startime=0;
        memMax=0;
        memStart=0;

        if(hasRun==TEST_RUN_TIME){
            index++
            report(cases[index],timecost/hasRun,memUse/hasRun/1024,function(){
                hasRun=0;
                memUse=0,timecost=0;
                setTimeout(function(){
                    runCase();
                },2000)
            })

        }else{
            setTimeout(function(){
                runCase();
            },2000)
        }
    }
    let commitor={
        "commit": function(){
           var rss=process.memoryUsage().rss;
           if(rss>memMax){
               memMax=rss;
           }
        }
    }
    let runCase=function(){
       if(index<cases.length){
           var mod= require(cases[index]);
           memStart=process.memoryUsage().rss;
           startime=Date.now();
           mod.run(commitor,cb);
       }else{
          console.log("All case done");
       }
    }
    runCase();
}