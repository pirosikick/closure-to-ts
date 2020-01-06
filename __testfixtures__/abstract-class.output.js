// goog.provide("a.b.AbstractSomeClass");

/**
 * @constructor
 */
export abstract class AbstractSomeClass {
 /**
  * @return {!a.b.AbstractSomeClass}
  */
 abstract clone(): AbstractSomeClass;
}