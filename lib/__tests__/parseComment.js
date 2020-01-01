const j = require("jscodeshift");
const parseComment = require("../parseComment");

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
 */
  `;

  expect(parseComment(comment)).toEqual({
    constructor: true,
    final: true,
    implements: "a.b.SomeInterface",
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
    property: undefined,
    return: undefined
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
    constructor: false,
    final: false,
    implements: undefined,
    params: [],
    return: undefined,
    property: {
      accessibility: "private",
      annotation: j.tsTypeAnnotation(j.tsTypeReference(j.identifier("Object")))
    }
  });
});
