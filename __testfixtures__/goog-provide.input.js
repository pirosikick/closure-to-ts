goog.provide("a.b.c");

a.b.c.someFunction = () => {
  const a = {};
  a.b = () => {};
};

// ignore because 'd.e.f' is not provided.
d.e.f.someFunction = () => {};
