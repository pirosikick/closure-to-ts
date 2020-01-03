const j = require("jscodeshift");
const constructorToClass = require("../constructorToClass");

test("constructorToClass", () => {
  const root = j(`
    a.b.c = function (str) {
      /**
       * Description
       * @private {string}
       */
      this.str = str;
    }
  `);
  const functionExpression = root.find(j.FunctionExpression).nodes()[0];
  const parsedComment = { params: [], implements: [] };
  const renameMap = new Map();

  expect(
    constructorToClass(functionExpression, parsedComment, renameMap)
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
