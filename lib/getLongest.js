module.exports = function getLongest(arg) {
  return arg.sort((a, b) => b.length - a.length)[0];
};
