const j = require("jscodeshift");
const parseComment = require("../parseComment");

const defaultResult = {
  interface: false,
  constructor: false,
  final: false,
  const: false,
  private: false,
  enum: false,
  define: false,
  implements: [],
  params: [],
  return: null,
  type: undefined
};

test("constructor", () => {
  const renameMap = new Map();
  const comment = `
  /**
 * Description
 *
 * @constructor
 * @final
 * @struct
 * @implements {SomeInterface}
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
  expect(parseComment(comment, renameMap)).toEqual({
    ...defaultResult,
    constructor: true,
    final: true,
    implements: [
      j.tsExpressionWithTypeArguments(j.identifier("SomeInterface"))
    ],
    params: [paramA, paramB, paramC]
  });
});

test("property: @private & @const", () => {
  const renameMap = new Map();
  const comment = `
  /**
   * Description
   * @const {!Object}
   * @private
   */
  `;

  expect(parseComment(comment, renameMap)).toEqual({
    ...defaultResult,
    const: true,
    private: true,
    type: j.tsTypeAnnotation(j.tsTypeReference(j.identifier("Object")))
  });
});

test("renameMap", () => {
  const renameMap = new Map();
  renameMap.set("a.b.SomeInterface", "SomeInterface");
  renameMap.set("a.b.SomeClass", "SomeClass");
  const comment = `
  /**
 * Description
 *
 * @implements {a.b.SomeInterface}
 * @param {!a.b.SomeClass} a package-internal implementation detail.
 * @return {!a.b.SomeClass}
 */
  `;
  const paramA = j.identifier("a");
  paramA.typeAnnotation = j.tsTypeAnnotation(
    j.tsTypeReference(j.identifier("SomeClass"))
  );
  expect(parseComment(comment, renameMap)).toEqual({
    ...defaultResult,
    implements: [
      j.tsExpressionWithTypeArguments(j.identifier("SomeInterface"))
    ],
    params: [paramA],
    return: j.tsTypeAnnotation(j.tsTypeReference(j.identifier("SomeClass")))
  });
});
