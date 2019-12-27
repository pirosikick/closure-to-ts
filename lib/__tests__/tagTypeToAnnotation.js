const j = require("jscodeshift");

const tagTypeToAnnotation = require("../tagTypeToAnnotation");

test.each([
  {
    type: { name: "boolean" },
    expected: j.tsTypeAnnotation(j.tsBooleanKeyword())
  },
  {
    type: { name: "string" },
    expected: j.tsTypeAnnotation(j.tsStringKeyword())
  },
  {
    type: { name: "SomeType" },
    expected: j.tsTypeReference(j.identifier("SomeType"))
  }
])(`case %#`, ({ type, expected }) => {
  expect(tagTypeToAnnotation(type)).toEqual(expected);
});
