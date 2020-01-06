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
    // Array<any>
    j.tsTypeAnnotation(
      j.tsTypeReference(
        j.identifier("Array"),
        j.tsTypeParameterInstantiation([j.tsAnyKeyword()])
      )
    )
  ],
  [
    "RestType + UnionType",
    {
      type: "RestType",
      expression: {
        type: "UnionType",
        elements: [
          { type: "NameExpression", name: "string" },
          { type: "UndefinedLiteral" }
        ]
      }
    },
    undefined,
    // Array<string | undefined>
    j.tsTypeAnnotation(
      j.tsTypeReference(
        j.identifier("Array"),
        j.tsTypeParameterInstantiation([
          j.tsUnionType([j.tsStringKeyword(), j.tsUndefinedKeyword()])
        ])
      )
    )
  ],
  [
    "NullableType",
    {
      type: "NullableType",
      expression: {
        type: "NameExpression",
        name: "string"
      }
    },
    undefined,
    j.tsTypeAnnotation(j.tsUnionType([j.tsStringKeyword(), j.tsNullKeyword()]))
  ],
  [
    "TypeApplication expression.name === 'Object'",
    {
      type: "TypeApplication",
      expression: {
        type: "NameExpression",
        name: "Object"
      },
      applications: [
        { type: "NameExpression", name: "string" },
        {
          type: "NullableType",
          expression: { type: "NameExpression", name: "string" }
        }
      ]
    },
    undefined,
    // { [key: string]: string | null }
    (() => {
      const indexSignature = j.tsIndexSignature([
        {
          ...j.identifier("key"),
          typeAnnotation: j.tsTypeAnnotation(j.tsStringKeyword())
        }
      ]);
      indexSignature.typeAnnotation = j.tsTypeAnnotation(
        j.tsUnionType([j.tsStringKeyword(), j.tsNullKeyword()])
      );
      return j.tsTypeAnnotation(j.tsTypeLiteral([indexSignature]));
    })()
  ],
  [
    "FunctionType",
    {
      type: "FunctionType",
      params: [{ type: "NameExpression", name: "number" }],
      result: { type: "NameExpression", name: "string" }
    },
    undefined,
    (() => {
      const arg0 = j.identifier("arg0");
      arg0.typeAnnotation = j.tsTypeAnnotation(j.tsNumberKeyword());
      const functionType = j.tsFunctionType([arg0]);
      functionType.typeAnnotation = j.tsTypeAnnotation(j.tsStringKeyword());

      return j.tsTypeAnnotation(functionType);
    })()
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
