const nodeToNs = require("./lib/nodeToNs");
const getLongest = require("./lib/getLongest");
const loadDeps = require("./lib/loadDeps");
const nsToCamel = require("./lib/nsToCamel");
const nsToNode = require("./lib/nsToNode");

/**
 *
 * @param {import('jscodeshift').FileInfo} fileInfo
 * @param {import('jscodeshift').API} api
 */
module.exports = function transformer(fileInfo, { jscodeshift: j }, options) {
  const root = j(fileInfo.source);
  const provideNamespaces = [];

  let dependencies = [];
  if (options.depsPath && options.closurePath) {
    const result = loadDeps(options.depsPath);
    dependencies = result.dependencies;
  }

  // goog.provide
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

  if (provideNamespaces.length > 0) {
  }

  // goog.require
  root
    .find(j.CallExpression, {
      callee: {
        object: { name: "goog" },
        property: { name: "require" }
      }
    })
    .forEach(path => {
      const [arg0] = path.node.arguments;
      if (!(arg0 && typeof arg0.value === "string")) {
        return;
      }
      const ns = arg0.value;
      const nsCamel = nsToCamel(ns);

      path.parentPath.replace(
        j.importDeclaration(
          [j.importNamespaceSpecifier(j.identifier(nsCamel))],
          j.stringLiteral(`FIXME/${ns}`)
        )
      );

      // aaa.bbb.ccc => aaaBbbCcc
      root.find(j.MemberExpression).forEach(path => {
        if (j.MemberExpression.check(path.parentPath.node)) {
          return;
        }

        const nodeNs = nodeToNs(path.node);

        if (ns === nodeNs) {
          path.replace(j.identifier(nsCamel));
          return;
        }

        if (nodeNs.indexOf(`${ns}.`) === 0) {
          // aaa.bbb.ccc.hello => aaaBbbCcc.hello
          const afterNs = [nsCamel, nodeNs.slice(`${ns}.`.length)].join(".");
          path.replace(nsToNode(afterNs));
        }
      });
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
      const ns = nodeToNs(node.left);
      const matchedNsList = provideNamespaces.filter(n => ns.indexOf(n) === 0);

      if (!ns || matchedNsList.length === 0) {
        return;
      }

      const matchedNs = getLongest(matchedNsList);

      if (ns === matchedNs && provideNamespaces.length === 1) {
        path.parentPath.replace(j.exportDefaultDeclaration(node.right));
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
