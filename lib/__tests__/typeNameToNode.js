const j = require("jscodeshift");

const typeNameToNode = require("../typeNameToNode");

test.each([
  ["a", j.identifier("a")],
  [
    "a.b.c",
    j.tsQualifiedName(
      j.tsQualifiedName(j.identifier("a"), j.identifier("b")),
      j.identifier("c")
    )
  ]
])("%s", (name, expected) => {
  expect(typeNameToNode(name)).toEqual(expected);
});
