// goog.provide("a.b.SomeClass");

/**
 * Description
 *
 * @constructor
 * @param {string} str
 */
export class SomeClass {
 private str: string;

 constructor(str: string) {
   /**
    * Description
    * @private {string}
    */
   this.str = str;
 }

 /**
  * Description
  * 
  * @param {string} a
  * @param {string} b
  */
 methodA(a: string, b: string) {}

 /**
  * @const
  */
 propertyA = false;

 /**
  * @return {string}
  */
 static staticMethod(): string {}
}

