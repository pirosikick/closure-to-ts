module.exports = "typescript";

const path_ = require("path");
const nodeToNs = require("./lib/nodeToNs");
const getLongest = require("./lib/getLongest");
const loadDeps = require("./lib/loadDeps");
const nsToCamel = require("./lib/nsToCamel");
const nsToNode = require("./lib/nsToNode");
const findDep = require("./lib/findDep");
const importPath = require("./lib/importPath");
const parseComment = require("./lib/parseComment");

/**
 *
 * @param {import('jscodeshift').FileInfo} fileInfo
 * @param {import('jscodeshift').API} api
 */
module.exports = function transformer(fileInfo, { jscodeshift: j }, options) {
  const root = j(fileInfo.source);
  const provideNamespaces = [];

  let dependencies;
  let closurePath;
  if (options.depsPath) {
    const result = loadDeps(options.depsPath);
    dependencies = result.dependencies;
    closurePath = options.closurePath || path_.dirname(options.depsPath);
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

      path.replace(
        j.commentLine(` goog.provide("${arg0.value}")`, false, false)
      );
    });

  const provideNs = provideNamespaces[0];
  const requireNs = [];

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

      requireNs.push(ns);

      path.parentPath.replace(
        j.importDeclaration(
          [j.importNamespaceSpecifier(j.identifier(nsCamel))],
          j.stringLiteral(
            importPath(dependencies, provideNs, ns, closurePath) ||
              `FIXME/${ns}`
          )
        )
      );
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

      const newNode =
        ns === matchedNs && provideNamespaces.length === 1
          ? j.exportDefaultDeclaration(node.right)
          : j.exportNamedDeclaration(
              j.variableDeclaration("const", [
                j.variableDeclarator(node.left.property, node.right)
              ])
            );

      newNode.comments = path.parentPath.node.comments;

      // Replace ExpressionStatement, which is parent of AssignmentExpression
      path.parentPath.replace(newNode);
    }
  });

  // aaa.bbb.ccc => aaaBbbCcc
  root.find(j.MemberExpression).forEach(path => {
    if (j.MemberExpression.check(path.parentPath.node)) {
      return;
    }

    const nodeNs = nodeToNs(path.node);
    if (nodeNs.indexOf(`${provideNs}.`) === 0) {
      // goog.provide('aaa.bbb.ccc')
      // aaa.bbb.ccc.hello => hello
      const afterNs = nodeNs.slice(`${provideNs}.`.length);
      path.replace(nsToNode(afterNs));
      return;
    }

    const ns = requireNs.find(
      n => n === nodeNs || nodeNs.indexOf(`${n}.`) === 0
    );
    if (!ns) {
      return;
    }

    if (ns === nodeNs) {
      path.replace(j.identifier(nsCamel));
      return;
    }

    if (nodeNs.indexOf(`${ns}.`) === 0) {
      // aaa.bbb.ccc.hello => aaaBbbCcc.hello
      const nsCamel = nsToCamel(ns);
      const afterNs = [nsCamel, nodeNs.slice(`${ns}.`.length)].join(".");
      path.replace(nsToNode(afterNs));
    }
  });

  root.find(j.Comment).forEach(path => {
    const { node } = path;
    if (!Array.isArray(path.node.comments)) {
      return;
    }

    const lastComment = path.node.comments[path.node.comments.length - 1];
    if (!j.CommentBlock.check(lastComment)) {
      return;
    }

    let parsed;
    try {
      parsed = parseComment(lastComment.value);
    } catch (e) {
      console.error(lastComment.value);
      return;
    }

    if (j.ExportNamedDeclaration.check(node)) {
      if (
        j.VariableDeclaration.check(node.declaration) &&
        j.VariableDeclarator.check(node.declaration.declarations[0])
      ) {
        const variableDecralator = node.declaration.declarations[0];

        // export const xxx = function (...) { ... }
        if (j.FunctionExpression.check(variableDecralator.init)) {
          addTypeAnnotationToFunctionExpression(
            j,
            variableDecralator.init,
            parsed
          );
          return;
        }

        // export const xxx = (...) ? function (...) { ... } : function (...) { ... }
        if (j.ConditionalExpression.check(variableDecralator.init)) {
          const init = variableDecralator.init;
          if (j.FunctionExpression.check(init.consequent)) {
            addTypeAnnotationToFunctionExpression(j, init.consequent, parsed);
          }
          if (j.FunctionExpression.check(init.alternate)) {
            addTypeAnnotationToFunctionExpression(j, init.alternate, parsed);
          }
        }
      }
    }
  });

  return root.toSource();
};

const addTypeAnnotationToFunctionExpression = (
  j,
  functionExpression,
  parsed
) => {
  if (parsed.return) {
    functionExpression.returnType = parsed.return;
  }

  if (parsed.params.length) {
    functionExpression.params = functionExpression.params.map(param => {
      const p = parsed.params.find(p => p.name === param.name);
      if (!p) {
        return param;
      }

      if (p.rest) {
        const newParam = j.restElement(param);
        newParam.typeAnnotation = p.annotation;
        return newParam;
      }

      return {
        ...param,
        typeAnnotation: p.annotation,
        optional: p.optional
      };
    });
  }
};
