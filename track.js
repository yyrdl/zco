/**
 * Created by yyrdl on 2017/6/1. Happy Children's Day
 * record and modify callstack
 */

/**
 * the separator between with each callstack-frame
 * */
var STACK_LINE_SEPARATOR = null;

/**
 * the first native callstack-frame ,right after the custom code
 * **/
var END_LINE = null;

var BLANK_LENGTH = 5;

/**
 * initialize
 * */
(function () {
	var error = new Error();
	var stack = error.stack;
	var index = 0;

	index = stack.indexOf(error.name) + error.name.length;
	end = stack.indexOf("at") + "at".length;
	STACK_LINE_SEPARATOR = stack.substring(index, end);
	BLANK_LENGTH = STACK_LINE_SEPARATOR.length - "at".length;

	index = stack.indexOf(STACK_LINE_SEPARATOR);
	index = stack.indexOf(STACK_LINE_SEPARATOR, index + 1);
	index = stack.indexOf(STACK_LINE_SEPARATOR, index + 1);
	var end = stack.indexOf(STACK_LINE_SEPARATOR, index + 1);
	END_LINE = stack.substring(index, end);

})()

/**
 * at zco_code where we catch the error
 * */
var GENERATOR_LINE = STACK_LINE_SEPARATOR + " Generator.next (<anonymous>)";

var appendStackFrame = function (error, frame) {
	if (error && "string" === typeof error.stack) {
		var index = error.stack.indexOf(GENERATOR_LINE);
		if (index !== -1) {

			error.stack = error.stack.substring(0, index) + "\n    " + frame;
		} else {
			/**
			 * some times the error is not been caught by zco
			 *
			 * */
			error.stack = error.stack + "\n    " + frame;
		}
	}
}

var callStackFrame = function (deep) {

	var stack = (new Error()).stack; // this is the most expensive operation
	var end_index = stack.indexOf(END_LINE);
	if (end_index === -1) {
		end_index = stack.length;
	}
	var start_index = stack.indexOf(STACK_LINE_SEPARATOR);
	if (!deep) {
		deep = 1;
	}
	for (var i = 0; i < deep; i++) {
		start_index = stack.indexOf(STACK_LINE_SEPARATOR, start_index + 1);
	}
	stack = stack.slice(start_index + BLANK_LENGTH, end_index);
	/**
	 * remove zco internal call-stack,zco core is robust enough ,and not going to modify anymore
	 * */
	if (stack.indexOf("at Generator.next") > -1 && stack.indexOf("at run") > -1 && stack.indexOf("at future") > -1) {
		var head = stack.slice(0, stack.lastIndexOf(STACK_LINE_SEPARATOR, stack.indexOf("at Generator.next")));
		end_index = stack.indexOf(STACK_LINE_SEPARATOR, stack.indexOf("at future"));
		if (end_index < 0 || (end_index + STACK_LINE_SEPARATOR.length) == stack.length) {
			stack = head;
		} else {
			stack = head + stack.slice(end_index, stack.length);
		}
	}
	return stack;
}

var makeTimeoutError = function (msg) {
	var error = new Error(msg);
	error.name = "TimeoutError";
	var stack = error.stack;
	var first_index = stack.indexOf(STACK_LINE_SEPARATOR);
	var msg = stack.substring(0, first_index);
	first_index = stack.indexOf(STACK_LINE_SEPARATOR, first_index + 1);
	first_index = stack.indexOf(STACK_LINE_SEPARATOR, first_index + 1);
	stack = stack.substring(first_index, stack.length);
	error.stack = msg + stack;
	return error;
}

exports.appendStackFrame = appendStackFrame;
exports.callStackFrame = callStackFrame;
exports.makeTimeoutError = makeTimeoutError;
