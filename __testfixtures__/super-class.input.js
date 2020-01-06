goog.provide('a.b.SomeClass');

goog.require('a.b.SuperClass');

/**
 * The description
 * 
 * @constructor
 * @param {string} a
 * @param {string} b
 * @extends {a.b.SuperClass}
 */
a.b.SomeClass = function (a, b) {
  a.b.SomeClass.base(this, 'constructor', a, b);
};
goog.inherits(a.b.SomeClass, a.b.SuperClass);

/**
 * The description
 * 
 * @param {string} a
 * @param {string} b
 */
a.b.SomeClass.prototype.methodA = function (a, b) {
  a.b.SomeClass.base(this, 'methodA', a, b);
};