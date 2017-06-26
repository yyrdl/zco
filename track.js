/**
 * Created by yyrdl on 2017/6/1. Happy Children's Day
 * record and modify callstack
 *
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

var tail = function (stack) {
	var index = stack.indexOf("zco_core_run");
	if (index > -1) {
		var next_index = stack.lastIndexOf("next", index);
		if (next_index != -1 && stack.lastIndexOf(STACK_LINE_SEPARATOR, index) === stack.indexOf(STACK_LINE_SEPARATOR, next_index)) {
			index = stack.lastIndexOf(STACK_LINE_SEPARATOR, next_index);
		} else {
			index = -1;
		}
	}
	return index;
}

var appendStackFrame = function (error, frame) {
	if (error && "string" === typeof error.stack) {
		var index = tail(error.stack);
		if (index != -1) {
			error.stack = error.stack.slice(0, index) + "\n    " + frame;
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
	 * remove zco internal call-stack
	 * */
	var next_index = stack.indexOf("next");

	if (next_index > -1 && stack.indexOf(STACK_LINE_SEPARATOR + " zco_core", next_index) === stack.indexOf(STACK_LINE_SEPARATOR, next_index)) {
		var head = stack.slice(0, stack.lastIndexOf(STACK_LINE_SEPARATOR, next_index));
		end_index = next_index;
		for (; ; ) {
			start_index = stack.indexOf("zco_core", end_index + 1);
			if (start_index > -1) {
				end_index = start_index;
			} else {
				break;
			}
		}
		end_index = stack.indexOf(STACK_LINE_SEPARATOR, end_index + 1);
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
