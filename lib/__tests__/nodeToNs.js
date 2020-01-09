const j = require("jscodeshift");

const nodeToNs = require("../nodeToNs");

test.each([
  // prettier-ignore
  [
    "Identifier",
    j.identifier("fuga"),
    "fuga"
  ],
  [
    "MemberExpression",
    j.memberExpression(j.identifier("a"), j.identifier("b")),
    "a.b"
  ],
  [
    "MemberExpression: node.object is MemberExpression",
    j.memberExpression(
      j.memberExpression(j.identifier("a"), j.identifier("b")),
      j.identifier("c")
    ),
    "a.b.c"
  ],
  [
    "MemberExpression: node.property is StringLiteral",
    j.memberExpression(j.identifier("a"), j.stringLiteral("b")),
    "a.b"
  ],
  [
    "TSQualifiedName",
    j.tsQualifiedName(j.identifier("a"), j.identifier("b")),
    "a.b"
  ],
  [
    "nested TSQualifiedName",
    j.tsQualifiedName(
      j.tsQualifiedName(j.identifier("a"), j.identifier("b")),
      j.identifier("c")
    ),
    "a.b.c"
  ]
])("%s", (name, node, expected) => {
  expect(nodeToNs(node)).toBe(expected);
});
