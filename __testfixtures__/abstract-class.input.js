goog.provide('a.b.AbstractSomeClass');

/**
 * @constructor
 */
a.b.AbstractSomeClass = function () {}

/**
 * @return {!a.b.AbstractSomeClass}
 */
a.b.AbstractSomeClass.prototype.clone = goog.abstractMethod;