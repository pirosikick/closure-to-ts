const api = require("jscodeshift");

const nsToNode = require("../nsToNode");

test("Identifier", () => {
  const node = nsToNode("hoge");
  expect(api.Identifier.check(node)).toBe(true);
  expect(node.name).toBe("hoge");
});

test("MemberExpression", () => {
  const node = nsToNode("hoge.fuga.duga");
  expect(api.MemberExpression.check(node)).toBe(true);
  expect(node.property.name).toBe("duga");
  expect(api.Identifier.check(node.object.property)).toBe(true);
  expect(node.object.property.name).toBe("fuga");
  expect(api.Identifier.check(node.object.object)).toBe(true);
  expect(node.object.object.name).toBe("hoge");
});
