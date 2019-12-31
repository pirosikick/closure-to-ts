goog.provide('a.b.c.d');

goog.require('a.b.c');

a.b.c.d.funcA = function () {
}

a.b.c.d.funcB = function () {
  a.b.c.d.funcA();
}