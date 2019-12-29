// goog.provide("app.a");

import * as appB from "./b";

export const someFunction = function someFunction() {
  appB.hello();
};