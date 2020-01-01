goog.provide('a.b.SomeClass');

/**
 * Description
 *
 * @constructor
 * @param {string} str
 */
a.b.SomeClass = function(str) {
  /**
   * Description
   * @private {string}
   */
  this.str = str;
};

/**
 * Description
 * 
 * @param {string} a
 * @param {string} b
 */
a.b.SomeClass.prototype.methodA = function (a, b) {}

/**
 * @const
 */
a.b.SomeClass.prototype.propertyA = false;

/**
 * @return {string}
 */
a.b.SomeClass.staticMethod = function () {}