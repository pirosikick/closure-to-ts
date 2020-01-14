module.exports = "typescript";

const path_ = require("path");
const j = require("jscodeshift");
const nodeToNs = require("./lib/nodeToNs");
const loadDeps = require("./lib/loadDeps");
const nsToCamel = require("./lib/nsToCamel");
const nsToNode = require("./lib/nsToNode");
const importPath = require("./lib/importPath");
const parseComment = require("./lib/parseComment");
const constructorToClass = require("./lib/constructorToClass");
const rename = require("./lib/rename");
const typeNameToNode = require("./lib/typeNameToNode");

// TODO generate automatically
const nonNullableTypes = [
  // @struct
  "goog.math.Vec3",
  "goog.math.Size",
  "goog.math.Coordinate",
  "goog.math.Rect",
  "goog.math.Integer.DivisionResult",
  "goog.math.Line",
  "goog.math.Range",
  "goog.math.Bezier",
  "goog.math.Box",
  "goog.math.Matrix",
  "goog.math.Vec2",
  "goog.math.Coordinate3",
  "goog.math.RangeSet",
  "goog.math.Path"
];

/**
 *
 * @param {import('jscodeshift').FileInfo} fileInfo
 * @param {import('jscodeshift').API} api
 */
module.exports = function transformer(fileInfo, _, options) {
  const root = j(fileInfo.source);

  // see: https://github.com/facebook/jscodeshift/blob/master/recipes/retain-first-comment.md
  const getFirstNode = () => root.find(j.Program).get("body", 0).node;
  const firstNode = getFirstNode();
  const { comments: firstNodeComments } = firstNode;

  let dependencies;
  let closurePath;
  if (options.depsPath) {
    const result = loadDeps(options.depsPath);
    dependencies = result.dependencies;
    closurePath = options.closurePath || path_.dirname(options.depsPath);
  }

  /**
   * @type {Array<string>}
   */
  const provideNsList = [];

  /**
   * @type {Map<string, string>}
   */
  const renameMap = new Map();

  /**
   * @type {Map<string, any>}
   */
  const declarationMap = new Map();

  // base.js
  let googBase = false;
  if (
    fileInfo.source.indexOf(
      "@fileoverview Bootstrap for the Google JS Library (Closure)."
    ) > -1
  ) {
    provideNsList.push("goog");
    googBase = true;
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
      if (!(arg0 && typeof arg0.value === "string")) {
        return;
      }
      const provideNs = arg0.value;
      provideNsList.push(provideNs);
      path.replace(
        j.commentLine(` goog.provide("${provideNs}")`, false, false)
      );
    });

  // goog.require & goog.forwardDeclare
  root
    .find(
      j.CallExpression,
      node =>
        j.MemberExpression.check(node.callee) &&
        node.callee.object.name === "goog" &&
        (node.callee.property.name === "require" ||
          node.callee.property.name === "forwardDeclare")
    )
    .forEach(path => {
      const [arg0] = path.node.arguments;
      if (!(arg0 && typeof arg0.value === "string")) {
        return;
      }
      const forwardDeclare =
        path.node.callee.property.name === "forwardDeclare";
      const ns = arg0.value;
      const lastChunk = ns.split(".").pop();

      const from = j.stringLiteral(
        importPath(dependencies, provideNsList[0], ns, closurePath) ||
          `FIXME/${ns}`
      );

      let specifiers;
      if (forwardDeclare || /^[A-Z]/.test(lastChunk)) {
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

  if (options.insertGoog && !googBase) {
    let googImported = false;
    root
      .find(j.MemberExpression, {
        object: {
          name: "goog"
        }
      })
      .forEach(path => {
        if (
          googImported ||
          j.MemberExpression.check(path.parent.node) ||
          !j.Identifier.check(path.node.property)
        ) {
          return;
        }

        if (!["inherits", "abstractMethod"].includes(path.node.property.name)) {
          const from = j.stringLiteral(
            importPath(dependencies, provideNsList[0], "goog", closurePath) ||
              `FIXME/goog`
          );
          const importDecl = j.importDeclaration(
            [j.importNamespaceSpecifier(j.identifier("goog"))],
            from
          );

          // needs to import base.ts
          const imports = root.find(j.ImportDeclaration);
          if (imports.length) {
            imports.get().insertBefore(importDecl);
          } else {
            root
              .find(j.Program)
              .get("body")
              .unshift(importDecl);
          }

          googImported = true;
        }
      });
  }

  root.find(j.ExpressionStatement).forEach(path => {
    if (!j.Program.check(path.parent.node)) {
      return;
    }

    const esNode = path.node;
    const node = path.node.expression;

    // goog.inherits(...)
    if (
      j.CallExpression.check(node) &&
      j.MemberExpression.check(node.callee) &&
      nodeToNs(node.callee) === "goog.inherits"
    ) {
      path.prune();
      return;
    }

    if (
      !(j.AssignmentExpression.check(node) || j.MemberExpression.check(node))
    ) {
      return;
    }

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
        parsedComment = parseComment(comment.value, nonNullableTypes);
      } catch (e) {
        console.warn("parseComment failed:", e, comment);
      }
    }

    if (parsedComment) {
      if (parsedComment.interface) {
        const declaration = j.tsInterfaceDeclaration(id, j.tsInterfaceBody([]));
        const enDeclaration = j.exportNamedDeclaration(declaration);
        enDeclaration.comments = [j.commentBlock(comment.value, true)];

        path.replace(enDeclaration);

        declarationMap.set(leftNs, declaration);
        renameMap.set(leftNs, idName);
        return;
      }

      if (parsedComment.constructor && j.FunctionExpression.check(node.right)) {
        const declaration = constructorToClass(
          nodeToNs(node.left),
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
            // TODO j.tsMethodSignature throws unexpected error
            // item = j.tsMethodSignature(key, params, parsedComment.return);
            item = {
              type: "TSMethodSignature",
              key,
              parameters: parsedComment.params,
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

            if (parsedComment.templates.length) {
              item.typeParameters = j.tsTypeParameterDeclaration(
                parsedComment.templates
              );
            }

            j(item)
              .find(j.CallExpression)
              .forEach(path => {
                const { callee, arguments: args } = path.node;
                if (
                  nodeToNs(callee) === `${declarationNs}.base` &&
                  args.length >= 2
                ) {
                  // SomeClass.base(this, 'methodName', ...) => super.methodName(...);
                  const methodName = args[1].value;
                  const newArgs = args.slice(2);
                  const newCallee =
                    methodName === "constructor"
                      ? j.super()
                      : j.memberExpression(j.super(), j.identifier(methodName));
                  path.replace(j.callExpression(newCallee, newArgs));
                }
              });
          } else if (nodeToNs(node.right) === "goog.abstractMethod") {
            item = j.tsDeclareMethod(
              key,
              parsedComment.params,
              parsedComment.return || null
            );
            item.abstract = true;
            declaration.abstract = true;
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

    if (j.MemberExpression.check(node)) {
      let declaration;
      if (parsedComment && parsedComment.typedef) {
        const typeAliasDeclaration = j.tsTypeAliasDeclaration(
          id,
          parsedComment.typedef
        );
        declaration = parsedComment.private
          ? typeAliasDeclaration
          : j.exportNamedDeclaration(typeAliasDeclaration);
      } else {
        const variableDeclaration = j.variableDeclaration(kind, [
          j.variableDeclarator(id)
        ]);
        const privateFlag = parsedComment ? parsedComment.private : true;
        declaration = privateFlag
          ? variableDeclaration
          : j.exportNamedDeclaration(variableDeclaration);

        if (parsedComment && parsedComment.type) {
          id.typeAnnotation = parsedComment.type;
        }
      }

      if (comment) {
        declaration.comments = [j.commentBlock(comment.value, true)];
      }

      renameMap.set(leftNs, idName);
      path.replace(declaration);
    } else if (j.AssignmentExpression.check(node)) {
      const variableDeclarator = j.variableDeclarator(id, node.right);
      if (parsedComment) {
        if (parsedComment.enum) {
          // as const
          variableDeclarator.init = j.tsAsExpression(
            variableDeclarator.init,
            j.tsTypeReference(j.identifier("const"))
          );
          path.insertAfter(
            j.exportNamedDeclaration(
              j.tsTypeAliasDeclaration(id, parsedComment.enum)
            )
          );
        }

        if (parsedComment.define && parsedComment.type) {
          id.typeAnnotation = parsedComment.type;
        }
      }

      const exportNamedDeclaration = j.exportNamedDeclaration(
        j.variableDeclaration(kind, [variableDeclarator])
      );

      if (comment) {
        exportNamedDeclaration.comments = [j.commentBlock(comment.value, true)];
      }

      renameMap.set(leftNs, idName);
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

  // aaa.bbb.ccc => aaaBbbCcc
  root.find(j.TSQualifiedName).forEach(path => {
    if (j.TSQualifiedName.check(path.parent.node)) {
      return;
    }

    const typeName = nodeToNs(path.node);
    const renamedTypeName = rename(renameMap, typeName);

    if (typeName !== renamedTypeName) {
      path.replace(typeNameToNode(renamedTypeName));
    }
  });

  root.find(j.ConditionalExpression).forEach(path => {
    const { node } = path;
    if (!(node.leadingComments && node.leadingComments.length)) {
      return;
    }

    const commentNode = node.leadingComments[node.leadingComments.length - 1];

    let parsedComment;
    try {
      parsedComment = parseComment(commentNode.value, nonNullableTypes);
    } catch (e) {
      console.error(e, commentNode.value);
      return;
    }

    if (parsedComment.type) {
      const typeAnnotation = parsedComment.type.typeAnnotation;
      const newNode = j.conditionalExpression(
        node.test,
        j.tsAsExpression(node.consequent, typeAnnotation),
        j.tsAsExpression(node.alternate, typeAnnotation)
      );
      path.replace(newNode);
    }
  });

  // see: https://github.com/facebook/jscodeshift/blob/master/recipes/retain-first-comment.md
  const firstNode2 = getFirstNode();
  if (firstNode2 !== firstNode) {
    firstNode2.comments = firstNodeComments;
  }

  return root.toSource();
};

const addTypeAnnotationToFunctionExpression = (
  functionExpression,
  parsedComment
) => {
  if (parsedComment.return) {
    functionExpression.returnType = parsedComment.return;
  }

  const newParams = functionExpression.params.map(param => {
    const p = parsedComment.params.find(p =>
      j.RestElement.check(p)
        ? param.name === p.argument.name
        : param.name === p.name
    );
    return p || param;
  });

  functionExpression.params = newParams;

  if (parsedComment.templates.length) {
    functionExpression.typeParameters = j.tsTypeParameterDeclaration(
      parsedComment.templates
    );
  }
};

const findMap = (map, callback) => {
  for (const entry of map.entries()) {
    if (callback(entry)) {
      return entry;
    }
  }
  return undefined;
};
