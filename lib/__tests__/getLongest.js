const getLongest = require("../getLongest");

test("getLongest", () => {
  expect(getLongest(["aa", "aaa", "a"])).toBe("aaa");
});
