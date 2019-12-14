const nodeToNamespace = require("./lib/nodeToNamespace");

/**
 *
 * @param {import('jscodeshift').FileInfo} fileInfo
 * @param {import('jscodeshift').API} api
 */
module.exports = function transformer(fileInfo, { jscodeshift: j }) {
  const root = j(fileInfo.source);
  const provideNamespaces = [];

  root
    .find(j.CallExpression, {
      callee: {
        object: { name: "goog" },
        property: { name: "provide" }
      }
    })
    .forEach(path => {
      const [arg0] = path.node.arguments;
      if (arg0 && typeof arg0.value === "string") {
        provideNamespaces.push(arg0.value);
      }
    });

  root.find(j.AssignmentExpression).forEach(path => {
    // ensure that path.node is defined at top-level scope
    if (
      !(
        path.parentPath && // ExpressionStatement
        path.parentPath.parentPath && // Program
        j.Program.check(path.parentPath.parentPath.node)
      )
    ) {
      return;
    }

    const { node } = path;

    if (j.MemberExpression.check(node.left)) {
      const ns = nodeToNamespace(node.left);
      const matchedNs = provideNamespaces.filter(n => ns.indexOf(n) === 0);

      if (!ns || matchedNs.length === 0) {
        return;
      }

      // Replace ExpressionStatement, which is parent of AssignmentExpression
      path.parentPath.replace(
        j.exportNamedDeclaration(
          j.variableDeclaration("const", [
            j.variableDeclarator(node.left.property, node.right)
          ])
        )
      );
    }
  });

  return root.toSource();
};
