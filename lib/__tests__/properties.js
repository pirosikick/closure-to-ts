const j = require("jscodeshift");
const properties = require("../properties");

const a = j.identifier("a");
const b = j.identifier("b");
const c = j.identifier("c");

test("MemberExpression", () => {
  const node = j.memberExpression(j.memberExpression(a, b), c);

  expect(properties(node)).toEqual([a, b, c]);
});

test("TSQualifiedName", () => {
  const node = j.tsQualifiedName(j.tsQualifiedName(a, b), c);

  expect(properties(node)).toEqual([a, b, c]);
});
