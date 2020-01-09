const j = require("jscodeshift");
const parseComment = require("../parseComment");

const defaultResult = {
  interface: false,
  constructor: false,
  final: false,
  const: false,
  private: false,
  enum: undefined,
  define: false,
  implements: [],
  params: [],
  return: null,
  type: undefined,
  templates: []
};

test("constructor", () => {
  const comment = `
  /**
   * Description
   *
   * @constructor
   * @final
   * @struct
   * @implements {a.b.SomeInterface}
   * @param {Object=} a package-internal implementation detail.
   * @param {string=} b package-internal implementation detail.
   * @param {...*} c package-internal implementation detail.
   */
  `;

  const paramA = j.identifier("a");
  paramA.typeAnnotation = j.tsTypeAnnotation(
    j.tsUnionType([
      j.tsTypeReference(j.identifier("Object")),
      j.tsNullKeyword()
    ])
  );
  paramA.optional = true;
  const paramB = j.identifier("b");
  paramB.typeAnnotation = j.tsTypeAnnotation(j.tsStringKeyword());
  paramB.optional = true;
  const paramC = j.restElement(j.identifier("c"));
  paramC.typeAnnotation = j.tsTypeAnnotation(
    j.tsTypeReference(
      j.identifier("Array"),
      j.tsTypeParameterInstantiation([j.tsAnyKeyword()])
    )
  );
  expect(parseComment(comment)).toEqual({
    ...defaultResult,
    constructor: true,
    final: true,
    implements: [
      j.tsExpressionWithTypeArguments(
        j.tsQualifiedName(
          j.tsQualifiedName(j.identifier("a"), j.identifier("b")),
          j.identifier("SomeInterface")
        )
      )
    ],
    params: [paramA, paramB, paramC]
  });
});

test("property: @private & @const", () => {
  const comment = `
  /**
   * Description
   * @const {!Object}
   * @private
   */
  `;

  expect(parseComment(comment)).toEqual({
    ...defaultResult,
    const: true,
    private: true,
    type: j.tsTypeAnnotation(j.tsTypeReference(j.identifier("Object")))
  });
});

test("@extends", () => {
  const comment = `
  /**
   * Description
   * @constructor
   * @extends {a.b.SuperClass}
   */`;

  expect(parseComment(comment)).toEqual({
    ...defaultResult,
    constructor: true,
    extends: j.memberExpression(
      j.memberExpression(j.identifier("a"), j.identifier("b")),
      j.identifier("SuperClass")
    )
  });
});
