const j = require("jscodeshift");

const tagTypeToAnnotation = require("../tagTypeToAnnotation");

test.each([
  [
    "NameExpression - boolean",
    {
      type: "NameExpression",
      name: "boolean"
    },
    j.tsTypeAnnotation(j.tsBooleanKeyword())
  ],
  [
    "NameExpression - string",
    {
      type: "NameExpression",
      name: "string"
    },
    j.tsTypeAnnotation(j.tsStringKeyword())
  ],
  [
    "NameExpression - SomeType",
    {
      type: "NameExpression",
      name: "SomeType"
    },
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
    j.tsTypeAnnotation(j.tsNullKeyword())
  ],
  [
    "UndefinedLiteral",
    {
      type: "UndefinedLiteral"
    },
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
    j.tsTypeAnnotation(j.tsStringKeyword())
  ],
  [
    "AllLiteral",
    {
      type: "AllLiteral"
    },
    j.tsTypeAnnotation(j.tsUnknownKeyword())
  ],
  [
    "NullableLiteral",
    {
      type: "NullableLiteral"
    },
    j.tsTypeAnnotation(j.tsAnyKeyword())
  ]
])(`%s`, (_, type, expected) => {
  expect(tagTypeToAnnotation(type)).toEqual(expected);
});
