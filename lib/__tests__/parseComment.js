const j = require("jscodeshift");
const parseComment = require("../parseComment");

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
    interface: false,
    constructor: true,
    final: true,
    private: false,
    const: false,
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
    ],
    return: undefined,
    type: undefined
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
    interface: false,
    constructor: false,
    final: false,
    private: false,
    const: true,
    implements: [],
    params: [],
    return: undefined,
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
    interface: false,
    constructor: false,
    final: false,
    private: false,
    const: false,
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
    return: j.tsTypeAnnotation(j.tsTypeReference(j.identifier("SomeClass"))),
    type: undefined
  });
});
