goog.provide("a.b.c");

/**
 * @param {string} arg The string
 * @return {boolean}
 */
export const someFunction = (arg) => {
  const a = {};
  a.b = () => {};
  return true;
};

// ignore because 'd.e.f' is not provided.
d.e.f.someFunction = () => {};
