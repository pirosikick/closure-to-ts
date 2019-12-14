const api = require("jscodeshift");
const properties = require("../properties");

test("properties", () => {
  const a = api.identifier("a");
  const b = api.identifier("b");
  const c = api.identifier("c");
  const node = api.memberExpression(api.memberExpression(a, b), c);

  expect(properties(node)).toEqual([a, b, c]);
});
