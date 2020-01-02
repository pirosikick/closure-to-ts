const j = require("jscodeshift");

const tagTypeToAnnotation = require("../tagTypeToAnnotation");

test.each([
  [
    "NameExpression - boolean",
    {
      type: "NameExpression",
      name: "boolean"
    },
    undefined,
    j.tsTypeAnnotation(j.tsBooleanKeyword())
  ],
  [
    "NameExpression - string",
    {
      type: "NameExpression",
      name: "string"
    },
    undefined,
    j.tsTypeAnnotation(j.tsStringKeyword())
  ],
  [
    "NameExpression - SomeType",
    {
      type: "NameExpression",
      name: "SomeType"
    },
    undefined,
    j.tsTypeAnnotation(
      j.tsUnionType([
        j.tsTypeReference(j.identifier("SomeType")),
        j.tsNullKeyword()
      ])
    )
  ],
  [
    "UnionType - string | number",
    {
      type: "UnionType",
      elements: [
        {
          type: "NameExpression",
          name: "string"
        },
        {
          type: "NameExpression",
          name: "number"
        }
      ]
    },
    undefined,
    j.tsTypeAnnotation(
      j.tsUnionType([j.tsStringKeyword(), j.tsNumberKeyword()])
    )
  ],
  [
    "UnionType - string | Array<string>",
    {
      type: "UnionType",
      elements: [
        {
          type: "NameExpression",
          name: "string"
        },
        {
          type: "TypeApplication",
          expression: {
            type: "NameExpression",
            name: "Array"
          },
          applications: [
            {
              type: "NameExpression",
              name: "string"
            }
          ]
        }
      ]
    },
    undefined,
    // string | Array<string> | null
    j.tsTypeAnnotation(
      j.tsUnionType([
        j.tsStringKeyword(),
        j.tsTypeReference(
          j.identifier("Array"),
          j.tsTypeParameterInstantiation([j.tsStringKeyword()])
        ),
        j.tsNullKeyword()
      ])
    )
  ],
  [
    "NonNullableType - !Object",
    {
      type: "NonNullableType",
      expression: {
        type: "NameExpression",
        name: "Object"
      }
    },
    undefined,
    // Object
    j.tsTypeAnnotation(j.tsTypeReference(j.identifier("Object")))
  ],
  [
    "TypeApplication - Array<string>",
    {
      type: "TypeApplication",
      expression: {
        type: "NameExpression",
        name: "Array"
      },
      applications: [
        {
          type: "NameExpression",
          name: "string"
        }
      ]
    },
    undefined,
    // Array<string> | null
    j.tsTypeAnnotation(
      j.tsUnionType([
        j.tsTypeReference(
          j.identifier("Array"),
          j.tsTypeParameterInstantiation([j.tsStringKeyword()])
        ),
        j.tsNullKeyword()
      ])
    )
  ],
  [
    "Nonullable & TypeApplication - !Array<string>",
    {
      type: "NonNullableType",
      expression: {
        type: "TypeApplication",
        expression: {
          type: "NameExpression",
          name: "Array"
        },
        applications: [
          {
            type: "NameExpression",
            name: "string"
          }
        ]
      }
    },
    undefined,
    // Array<string>
    j.tsTypeAnnotation(
      j.tsTypeReference(
        j.identifier("Array"),
        j.tsTypeParameterInstantiation([j.tsStringKeyword()])
      )
    )
  ],
  [
    "NullLiteral",
    {
      type: "NullLiteral"
    },
    undefined,
    j.tsTypeAnnotation(j.tsNullKeyword())
  ],
  [
    "UndefinedLiteral",
    {
      type: "UndefinedLiteral"
    },
    undefined,
    j.tsTypeAnnotation(j.tsUndefinedKeyword())
  ],
  [
    "OptionalType",
    {
      type: "OptionalType",
      expression: {
        type: "NameExpression",
        name: "string"
      }
    },
    undefined,
    j.tsTypeAnnotation(j.tsStringKeyword())
  ],
  [
    "AllLiteral",
    {
      type: "AllLiteral"
    },
    undefined,
    j.tsTypeAnnotation(j.tsAnyKeyword())
  ],
  [
    "NullableLiteral",
    {
      type: "NullableLiteral"
    },
    undefined,
    j.tsTypeAnnotation(j.tsAnyKeyword())
  ],
  [
    "RestType",
    {
      type: "RestType",
      expression: {
        type: "AllLiteral"
      }
    },
    undefined,
    j.tsTypeAnnotation(j.tsArrayType(j.tsAnyKeyword()))
  ],
  [
    "renameMap",
    {
      type: "NameExpression",
      name: "a.b.SomeType"
    },
    [["a.b.SomeType", "SomeType"]],
    j.tsTypeAnnotation(
      j.tsUnionType([
        j.tsTypeReference(j.identifier("SomeType")),
        j.tsNullKeyword()
      ])
    )
  ]
])(`%s`, (_, type, renameEntries, expected) => {
  const renameMap = new Map();
  if (Array.isArray(renameEntries)) {
    renameEntries.forEach(([key, value]) => renameMap.set(key, value));
  }

  expect(tagTypeToAnnotation(type, renameMap)).toEqual(expected);
});
