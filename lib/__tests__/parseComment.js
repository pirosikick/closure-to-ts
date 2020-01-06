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
  return: undefined,
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
 */
  `;

  expect(parseComment(comment, renameMap)).toEqual({
    ...defaultResult,
    constructor: true,
    final: true,
    implements: [
      j.tsExpressionWithTypeArguments(j.identifier("SomeInterface"))
    ],
    params: [
      {
        name: "a",
        optional: true,
        rest: false,
        annotation: j.tsTypeAnnotation(
          j.tsUnionType([
            j.tsTypeReference(j.identifier("Object")),
            j.tsNullKeyword()
          ])
        )
      },
      {
        name: "b",
        optional: true,
        rest: false,
        annotation: j.tsTypeAnnotation(j.tsStringKeyword())
      }
    ]
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
  expect(parseComment(comment, renameMap)).toEqual({
    ...defaultResult,
    implements: [
      j.tsExpressionWithTypeArguments(j.identifier("SomeInterface"))
    ],
    params: [
      {
        name: "a",
        annotation: j.tsTypeAnnotation(
          j.tsTypeReference(j.identifier("SomeClass"))
        ),
        optional: false,
        rest: false
      }
    ],
    return: j.tsTypeAnnotation(j.tsTypeReference(j.identifier("SomeClass")))
  });
});
