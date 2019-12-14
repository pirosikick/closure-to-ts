goog.provide("a.b.c");

export const someFunction = () => {
  const a = {};
  a.b = () => {};
};

// ignore because 'd.e.f' is not provided.
d.e.f.someFunction = () => {};
