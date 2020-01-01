module.exports = "typescript";

const path_ = require("path");
const j = require("jscodeshift");
const nodeToNs = require("./lib/nodeToNs");
const getLongest = require("./lib/getLongest");
const loadDeps = require("./lib/loadDeps");
const nsToCamel = require("./lib/nsToCamel");
const nsToNode = require("./lib/nsToNode");
const findDep = require("./lib/findDep");
const importPath = require("./lib/importPath");
const parseComment = require("./lib/parseComment");
const addTypeAnnotationToParams = require("./lib/addTypeAnnotationToParams");
const constructorToClass = require("./lib/constructorToClass");

/**
 *
 * @param {import('jscodeshift').FileInfo} fileInfo
 * @param {import('jscodeshift').API} api
 */
module.exports = function transformer(fileInfo, _, options) {
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

  root.find(j.Comment).forEach(path => {
    if (
      !(
        j.CommentBlock.check(path.value) &&
        path.value.leading &&
        // ensure top-level NodePath
        j.ExpressionStatement.check(path.node) &&
        j.Program.check(path.parent.node)
      )
    ) {
      return;
    }

    const comment = path.value;
    const expressionStatement = path.node;
    const node = expressionStatement.expression;

    if (!j.AssignmentExpression.check(node)) {
      return;
    }

    let parsed;
    try {
      parsed = parseComment(comment.value);
    } catch (e) {
      console.error(comment.value);
      return;
    }

    const { left, right } = node;

    // x.x.x = function (...) { ... }
    if (j.FunctionExpression.check(right)) {
      if (parsed.constructor) {
        const classDeclaration = constructorToClass(right, parsed);
        classDeclaration.leadingComments = [
          j.commentBlock(comment.value, true)
        ];

        if (!classDeclaration.id) {
          if (
            j.MemberExpression.check(left) &&
            j.Identifier.check(left.property)
          ) {
            classDeclaration.id = left.property;
          } else if (j.Identifier(left)) {
            classDeclaration.id = left;
          }
        }

        node.right = classDeclaration;
        return;
      }

      addTypeAnnotationToFunctionExpression(right, parsed);
      return;
    }

    // x.x.x = (...) ? function (...) { ... } : function (...) { ... }
    if (j.ConditionalExpression.check(right)) {
      if (j.FunctionExpression.check(right.consequent)) {
        addTypeAnnotationToFunctionExpression(right.consequent, parsed);
      }
      if (j.FunctionExpression.check(right.alternate)) {
        addTypeAnnotationToFunctionExpression(right.alternate, parsed);
      }

      return;
    }
  });

  root.find(j.AssignmentExpression).forEach(path => {
    // ensure that path.node is defined at top-level scope
    if (!isTopLevelAssignmentExpression(path)) {
      return;
    }

    const { node } = path;

    if (j.MemberExpression.check(node.left)) {
      const ns = nodeToNs(node.left);
      const matchedNsList = provideNamespaces.filter(n => ns.indexOf(n) === 0);

      if (!ns || matchedNsList.length === 0) {
        return;
      }

      const newNode = j.ClassDeclaration.check(node.right)
        ? j.exportNamedDeclaration(node.right)
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

    const ns = requireNs.find(
      n => n === nodeNs || nodeNs.indexOf(`${n}.`) === 0
    );

    if (ns && provideNs.indexOf(ns) !== 0) {
      if (ns === nodeNs) {
        path.replace(j.identifier(nsCamel));
      }

      if (nodeNs.indexOf(`${ns}.`) === 0) {
        // aaa.bbb.ccc.hello => aaaBbbCcc.hello
        const nsCamel = nsToCamel(ns);
        const afterNs = [nsCamel, nodeNs.slice(`${ns}.`.length)].join(".");
        path.replace(nsToNode(afterNs));
      }

      return;
    }

    if (nodeNs.indexOf(`${provideNs}.`) === 0) {
      // goog.provide('aaa.bbb.ccc')
      // aaa.bbb.ccc.hello => hello
      const afterNs = nodeNs.slice(`${provideNs}.`.length);
      path.replace(nsToNode(afterNs));
      return;
    }
  });
  return root.toSource();
};

const isTopLevelAssignmentExpression = path => {
  return (
    j.AssignmentExpression.check(path.node) &&
    path.parentPath && // ExpressionStatement
    path.parentPath.parentPath && // Program
    j.Program.check(path.parentPath.parentPath.node)
  );
};

const addTypeAnnotationToFunctionExpression = (functionExpression, parsed) => {
  if (parsed.return) {
    functionExpression.returnType = parsed.return;
  }

  functionExpression.params = addTypeAnnotationToParams(
    functionExpression.params,
    parsed
  );
};
