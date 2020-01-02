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
const rename = require("./lib/rename");

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

  const renameMap = new Map();
  const classMap = new Map();

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
      if (!(arg0 && typeof arg0.value === "string")) {
        return;
      }
      const provideNs = arg0.value;
      const lastChunk = provideNs.split(".").pop();

      if (/^[A-Z]/.test(lastChunk)) {
        // goog.provide('a.b.c.SomeClass')
        renameMap.set(provideNs, lastChunk);
      } else {
        // goog.provide('a.b.c')
        renameMap.set(provideNs, "");
      }

      provideNamespaces.push(provideNs);
      path.replace(
        j.commentLine(` goog.provide("${provideNs}")`, false, false)
      );
    });

  const provideNs = provideNamespaces[0];

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
      const lastChunk = ns.split(".").pop();

      const from = j.stringLiteral(
        importPath(dependencies, provideNs, ns, closurePath) || `FIXME/${ns}`
      );

      let specifiers;
      if (/^[A-Z]/.test(lastChunk)) {
        // goog.require('a.b.SomeClass') => import { SomeClass } from 'xxx';
        specifiers = [j.importSpecifier(j.identifier(lastChunk))];
        renameMap.set(ns, lastChunk);
      } else {
        // goog.require('a.b.c') => import * as aBC from 'xxx';
        const nsCamel = nsToCamel(ns);
        specifiers = [j.importNamespaceSpecifier(j.identifier(nsCamel))];
        renameMap.set(ns, nsCamel);
      }

      path.parentPath.replace(j.importDeclaration(specifiers, from));
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
      parsed = parseComment(comment.value, renameMap);
    } catch (e) {
      console.error(comment.value);
      return;
    }

    const { left, right } = node;

    // x.x.x = function (...) { ... }
    if (j.FunctionExpression.check(right)) {
      if (parsed.constructor) {
        const classDeclaration = constructorToClass(right, parsed, renameMap);
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
        classMap.set(nodeToNs(node.left), classDeclaration);
        renameMap.set(nodeToNs(node.left), classDeclaration.id.name);
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

    // x.x.x = ...
    if (j.MemberExpression.check(node.left)) {
      const ns = nodeToNs(node.left);
      if (!ns) {
        return;
      }

      const classEntry = findMap(
        classMap,
        ([classNs]) => ns.indexOf(classNs) === 0 && ns !== classNs
      );
      if (classEntry) {
        const [classNs, classDeclaration] = classEntry;
        const chunks = ns.slice(classNs.length + 1).split(".");

        if (!(chunks.length === 1 || chunks.length === 2)) {
          return;
        }

        const key = j.identifier(chunks[chunks.length - 1]);
        let item;
        if (j.FunctionExpression.check(node.right)) {
          item = j.classMethod(
            "method",
            key,
            node.right.params,
            node.right.body
          );
          item.returnType = node.right.returnType;
        } else {
          item = j.classProperty(key, node.right);
        }

        item.static = chunks.length === 1;
        item.comments = path.parent.node.leadingComments;

        classDeclaration.body = j.classBody([
          ...classDeclaration.body.body,
          item
        ]);
        path.prune();

        return;
      }

      const matchedNsList = provideNamespaces.filter(n => ns.indexOf(n) === 0);
      if (matchedNsList.length === 0) {
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
    const renameNodeNs = rename(renameMap, nodeNs);

    if (nodeNs !== renameNodeNs) {
      path.replace(nsToNode(renameNodeNs));
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

const findMap = (map, callback) => {
  for (const entry of map.entries()) {
    if (callback(entry)) {
      return entry;
    }
  }
  return undefined;
};
