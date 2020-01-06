// goog.provide("a.b.SomeClass");

import { SuperClass } from "FIXME/a.b.SuperClass";

/**
 * The description
 * 
 * @constructor
 * @param {string} a
 * @param {string} b
 * @extends {a.b.SuperClass}
 */
export class SomeClass extends SuperClass {
 constructor(a: string, b: string) {
   super(a, b);
 }

 /**
  * The description
  * 
  * @param {string} a
  * @param {string} b
  */
 methodA(a: string, b: string) {
   super.methodA(a, b);
 }
}
