goog.provide("app.a");

goog.require("app.b");

app.a.someFunction = function someFunction() {
  app.b.hello();
};