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
    "NameExpression - a.b.c.SomeType",
    {
      type: "NameExpression",
      name: "a.b.c.SomeType"
    },
    j.tsTypeAnnotation(
      j.tsUnionType([
        j.tsTypeReference(
          j.tsQualifiedName(
            j.tsQualifiedName(
              j.tsQualifiedName(j.identifier("a"), j.identifier("b")),
              j.identifier("c")
            ),
            j.identifier("SomeType")
          )
        ),
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
    j.tsTypeAnnotation(j.tsAnyKeyword())
  ],
  [
    "NullableLiteral",
    {
      type: "NullableLiteral"
    },
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
    (() => {
      const arg0 = j.identifier("arg0");
      arg0.typeAnnotation = j.tsTypeAnnotation(j.tsNumberKeyword());
      const functionType = j.tsFunctionType([arg0]);
      functionType.typeAnnotation = j.tsTypeAnnotation(j.tsStringKeyword());

      return j.tsTypeAnnotation(functionType);
    })()
  ],
  [
    "templates",
    {
      type: "NameExpression",
      name: "T"
    },
    j.tsTypeAnnotation(j.tsTypeReference(j.identifier("T")))
  ],
  [
    "RecordType",
    {
      type: "RecordType",
      fields: [
        {
          type: "FieldType",
          key: "hoge",
          value: {
            type: "NameExpression",
            name: "boolean"
          }
        }
      ]
    },
    j.tsTypeAnnotation(
      j.tsTypeLiteral([
        j.tsPropertySignature(
          j.identifier("hoge"),
          j.tsTypeAnnotation(j.tsBooleanKeyword())
        )
      ])
    )
  ]
])(`%s`, (_, type, expected) => {
  const templates = ["T"];
  expect(tagTypeToAnnotation(type, templates)).toEqual(expected);
});
