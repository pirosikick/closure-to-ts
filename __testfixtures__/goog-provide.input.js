goog.provide("a.b.c");

/**
 * @param {string} arg The string
 * @return {boolean}
 */
a.b.c.someFunction = (arg) => {
  const a = {};
  a.b = () => {};
  return true;
};

/**
 * @param {string} arg The string
 * @return {boolean}
 */
a.b.c.someFunction2 = (arg) => {
  return a.b.c.someFunction();
};

// ignore because 'd.e.f' is not provided.
d.e.f.someFunction = () => {};
