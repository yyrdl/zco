

const util=require("./util");
const fs=require("fs");
const args = require('optimist').argv;



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

var  run=function(modulename,name,times){

    var fn=require(modulename);
    measure(fn,parseInt(times),function(err,reportdata){
        var line=name+","+reportdata.time+","+reportdata.mem+";";
        fs.appendFile("./report.txt",line,function () {
            
        });
    });

}


if(args.m){
   run(args.m,args.n,args.t);
}
