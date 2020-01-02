const rename = require("../rename");

const renameMap = new Map();
renameMap.set("a.b.c", "");
renameMap.set("a.b.c.d", "aBCD");
renameMap.set("a.b.c.SomeClass", "SomeClass");

test.each([
  ["a.b.c.hoge", "hoge"],
  ["a.b.c.d.hoge", "aBCD.hoge"],
  ["a.b.c.SomeClass", "SomeClass"],
  ["a.b.c.SomeClass.prototype.fuga", "SomeClass.prototype.fuga"],
  ["a.b.cd", "a.b.cd"]
])("%s => %s", (name, expected) => {
  expect(rename(renameMap, name)).toBe(expected);
});
