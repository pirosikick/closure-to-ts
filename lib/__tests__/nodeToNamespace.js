const api = require("jscodeshift");

const nodeToNamespace = require("../nodeToNamespace");

test.each([
  // prettier-ignore
  [
    "Identifier",
    api.identifier("fuga"),
    "fuga"
  ],
  [
    "MemberExpression",
    api.memberExpression(api.identifier("a"), api.identifier("b")),
    "a.b"
  ],
  [
    "MemberExpression: node.object is MemberExpression",
    api.memberExpression(
      api.memberExpression(api.identifier("a"), api.identifier("b")),
      api.identifier("c")
    ),
    "a.b.c"
  ],
  [
    "MemberExpression: node.property is StringLiteral",
    api.memberExpression(api.identifier("a"), api.stringLiteral("b")),
    "a.b"
  ]
])("%s", (name, node, expected) => {
  expect(nodeToNamespace(node)).toBe(expected);
});
