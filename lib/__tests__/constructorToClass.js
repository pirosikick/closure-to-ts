const j = require("jscodeshift");
const constructorToClass = require("../constructorToClass");

test("constructorToClass", () => {
  const root = j(`
    a.b.SomeClass = function (str) {
      /**
       * Description
       * @private {string}
       */
      this.str = str;

      /**
       * @type {string}
       */
      this.val2 = '';
    }
  `);
  const ns = "a.b.SomeClass";
  const functionExpression = root.find(j.FunctionExpression).nodes()[0];
  const parsedComment = { params: [], implements: [], templates: [] };
  const renameMap = new Map();

  expect(
    constructorToClass(ns, functionExpression, parsedComment, renameMap)
  ).toEqual(
    j.classDeclaration(
      functionExpression.id,
      j.classBody([
        {
          ...j.classProperty(
            j.identifier("str"),
            null,
            j.tsTypeAnnotation(j.tsStringKeyword())
          ),
          accessibility: "private"
        },
        j.classProperty(
          j.identifier("val2"),
          null,
          j.tsTypeAnnotation(j.tsStringKeyword())
        ),
        j.classMethod(
          "constructor",
          j.identifier("constructor"),
          functionExpression.params,
          functionExpression.body
        )
      ])
    )
  );
});
