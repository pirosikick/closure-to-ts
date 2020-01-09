// goog.provide("a.b.SomeClass");

import { SuperClass } from "FIXME/a.b.SuperClass";
import { SomeInterface } from "FIXME/a.b.SomeInterface";

/**
 * The description
 * 
 * @constructor
 * @param {string} a
 * @param {string} b
 * @extends {a.b.SuperClass}
 * @implements {a.b.SomeInterface}
 */
export class SomeClass extends SuperClass implements SomeInterface {
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
