/**
 * Created by yyrdl on 2017/6/1.
 * track call stack
 */
var STACK_LINE_SEPARATOR="\n    at";

var END_LINE=" ";

(function () {
    var stack=(new Error()).stack;
    var index=stack.indexOf(STACK_LINE_SEPARATOR);
    index=stack.indexOf(STACK_LINE_SEPARATOR,index+1);
    index=stack.indexOf(STACK_LINE_SEPARATOR,index+1);
    var end=stack.indexOf(STACK_LINE_SEPARATOR,index+1);
    END_LINE=stack.substring(index,end);
})()


var GENERATOR_LINE=STACK_LINE_SEPARATOR+" Generator.next (<anonymous>)";

var appendStackFrame=function (error,frame) {
    if(error && "string"===typeof error.stack){
        var index=error.stack.indexOf(GENERATOR_LINE);
        if(index !==-1){
            error.stack=error.stack.substring(0,index)+"\n    "+frame;
        }else{
            error.stack=error.stack+"\n    "+frame;
        }
    }
}

var callStackFrame=function (deep) {
    var stack=(new Error()).stack;
    var end_index=stack.indexOf(END_LINE);
    if(end_index === -1){
        end_index=stack.length;
    }
    var start_index=stack.indexOf(STACK_LINE_SEPARATOR);
    if(!deep){
        deep=1;
    }
    for(var i=0;i<deep;i++){
        start_index=stack.indexOf(STACK_LINE_SEPARATOR,start_index+1);
    }
    return stack.substring(start_index,end_index).trim();
}

var makeTimeoutError=function (msg) {
    var error = new Error(msg);
    error.name = "TimeoutError";
    var stack = error.stack || " ";
    var first_index = stack.indexOf(STACK_LINE_SEPARATOR);
    var msg = stack.substring(0, first_index);
    first_index = stack.indexOf(STACK_LINE_SEPARATOR, first_index + 1);
    first_index = stack.indexOf(STACK_LINE_SEPARATOR, first_index + 1);
    stack = stack.substring(first_index, stack.length);
    error.stack = msg + stack;
    return error;
}

exports.appendStackFrame=appendStackFrame;
exports.callStackFrame=callStackFrame;
exports.makeTimeoutError=makeTimeoutError;