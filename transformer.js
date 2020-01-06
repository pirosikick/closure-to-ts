module.exports = "typescript";

const path_ = require("path");
const j = require("jscodeshift");
const nodeToNs = require("./lib/nodeToNs");
const loadDeps = require("./lib/loadDeps");
const nsToCamel = require("./lib/nsToCamel");
const nsToNode = require("./lib/nsToNode");
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
  const provideNsList = [];

  let dependencies;
  let closurePath;
  if (options.depsPath) {
    const result = loadDeps(options.depsPath);
    dependencies = result.dependencies;
    closurePath = options.closurePath || path_.dirname(options.depsPath);
  }

  /**
   * @type {Map.<string, string>}
   */
  const renameMap = new Map();

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

      provideNsList.push(provideNs);
      path.replace(
        j.commentLine(` goog.provide("${provideNs}")`, false, false)
      );
    });

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
        importPath(dependencies, provideNsList[0], ns, closurePath) ||
          `FIXME/${ns}`
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

  const declarationMap = new Map();

  root.find(j.ExpressionStatement).forEach(path => {
    if (
      !(
        j.Program.check(path.parent.node) &&
        (j.AssignmentExpression.check(path.node.expression) ||
          j.MemberExpression.check(path.node.expression))
      )
    ) {
      return;
    }

    const esNode = path.node;
    const node = path.node.expression;

    const leftNs = j.MemberExpression.check(node)
      ? nodeToNs(node)
      : nodeToNs(node.left);
    const idName = leftNs.split(".").pop();
    const id = j.identifier(idName);
    if (
      !provideNsList.filter(n => leftNs === n || leftNs.indexOf(`${n}.`) === 0)
        .length
    ) {
      return;
    }

    const comments = esNode.leadingComments;

    let comment;
    let parsedComment;
    if (
      esNode.leadingComments &&
      esNode.leadingComments.length > 0 &&
      j.CommentBlock.check(esNode.leadingComments[comments.length - 1])
    ) {
      comment = esNode.leadingComments[comments.length - 1];

      try {
        parsedComment = parseComment(comment.value, renameMap);
      } catch (e) {
        console.warn("parseComment failed:", e);
      }
    }

    if (parsedComment) {
      if (parsedComment.interface) {
        const declaration = j.tsInterfaceDeclaration(id, j.tsInterfaceBody([]));
        const enDeclaration = j.exportNamedDeclaration(declaration);
        enDeclaration.comments = [j.commentBlock(comment.value, true)];

        path.replace(enDeclaration);

        declarationMap.set(leftNs, declaration);
        return;
      }

      if (parsedComment.constructor && j.FunctionExpression.check(node.right)) {
        const declaration = constructorToClass(
          node.right,
          parsedComment,
          renameMap
        );
        declaration.id = declaration.id || id;
        const enDeclaration = j.exportNamedDeclaration(declaration);
        enDeclaration.comments = [j.commentBlock(comment.value, true)];

        path.replace(enDeclaration);

        declarationMap.set(leftNs, declaration);
        renameMap.set(leftNs, idName);
        return;
      }

      if (parsedComment.params.length || parsedComment.return) {
        if (j.FunctionExpression.check(node.right)) {
          addTypeAnnotationToFunctionExpression(node.right, parsedComment);
        } else if (j.ConditionalExpression.check(node.right)) {
          // x.x.x = (...) ? function (...) { ... } : function (...) { ... }
          if (j.FunctionExpression.check(node.right.consequent)) {
            addTypeAnnotationToFunctionExpression(
              node.right.consequent,
              parsedComment
            );
          }
          if (j.FunctionExpression.check(node.right.alternate)) {
            addTypeAnnotationToFunctionExpression(
              node.right.alternate,
              parsedComment
            );
          }
        }
      }

      const declarationEntry = findMap(
        declarationMap,
        ([key]) => leftNs.indexOf(`${key}.`) === 0
      );
      if (declarationEntry) {
        const [declarationNs, declaration] = declarationEntry;
        const remainNs = leftNs.slice(`${declarationNs}.`.length);
        const chunks = remainNs.split(".");
        const key = j.identifier(chunks[chunks.length - 1]);

        if (
          j.TSInterfaceDeclaration.check(declaration) &&
          chunks.length === 2
        ) {
          let item;
          if (parsedComment.type) {
            item = j.tsPropertySignature(key);
            item.typeAnnotation = parsedComment.type;
          } else if (parsedComment.return || parsedComment.params.length) {
            const params = parsedComment.params.map(param => {
              const paramId = j.identifier(param.name);
              if (param.rest) {
                const restElement = j.restElement(paramId);
                restElement.typeAnnotation = param.annotation;
                return restElement;
              }
              paramId.typeAnnotation = param.annotation;
              paramId.optional = param.optional;
              return paramId;
            });
            // TODO j.tsMethodSignature throws unexpected error
            // item = j.tsMethodSignature(key, params, parsedComment.return);
            item = {
              type: "TSMethodSignature",
              key,
              parameters: params,
              typeAnnotation: parsedComment.return
            };
          }

          item.comments = [j.commentBlock(comment.value, true)];
          declaration.body.body.push(item);
          path.prune();
        } else if (
          j.AssignmentExpression.check(node) &&
          j.ClassDeclaration.check(declaration) &&
          (chunks.length === 1 || chunks.length === 2)
        ) {
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
          item.comments = [j.commentBlock(comment.value, true)];
          declaration.body = j.classBody([...declaration.body.body, item]);
          path.prune();
        }

        return;
      }
    }

    if (j.AssignmentExpression.check(node)) {
      const kind =
        !parsedComment ||
        parsedComment.const ||
        parsedComment.enum ||
        parsedComment.define ||
        // node.right is Function
        parsedComment.return ||
        !!parsedComment.params.length
          ? "const"
          : "let";
      const exportNamedDeclaration = j.exportNamedDeclaration(
        j.variableDeclaration(kind, [j.variableDeclarator(id, node.right)])
      );

      if (comment) {
        exportNamedDeclaration.comments = [j.commentBlock(comment.value, true)];
      }

      path.replace(exportNamedDeclaration);
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
