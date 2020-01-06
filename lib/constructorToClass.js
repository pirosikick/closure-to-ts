const j = require("jscodeshift");
const parseComment = require("./parseComment");
const nodeToNs = require("./nodeToNs");

module.exports = function constructorToClass(
  ns,
  functionExpression,
  parsedComment,
  renameMap
) {
  let body = j.classBody([]);
  if (functionExpression.body.body.length) {
    const newParams = functionExpression.params.map(param => {
      const p = parsedComment.params.find(p =>
        j.RestElement.check(p)
          ? param.name === p.argument.name
          : param.name === p.name
      );
      return p || param;
    });
    const constructor = j.classMethod(
      "constructor",
      j.identifier("constructor"),
      newParams,
      functionExpression.body
    );
    const properties = propertiesFromBody(functionExpression.body, renameMap);
    body = j.classBody([...properties, constructor]);
  }

  const declaration = j.classDeclaration(functionExpression.id, body);

  if (parsedComment.extends) {
    declaration.superClass = parsedComment.extends;
    const superClassName = parsedComment.extends.name;

    j(declaration)
      .find(j.CallExpression)
      .forEach(path => {
        const { callee, arguments: args } = path.node;
        const calleeNs = nodeToNs(callee);

        let methodName;
        let newArgs;

        if (calleeNs === `${ns}.base` && args.length >= 2) {
          // SomeClass.base(this, 'methodName', ...) => super.methodName(...);
          methodName = args[1].value;
          newArgs = args.slice(2);
        } else if (calleeNs.match(new RegExp(`${superClassName}\\.call$`))) {
          // SuperClass.call(this, ...) => super(...);
          methodName = "constructor";
          newArgs = args.slice(1);
        }

        if (methodName) {
          const newCallee =
            methodName === "constructor"
              ? j.super()
              : j.memberExpression(j.super(), j.identifier(methodName));
          path.replace(j.callExpression(newCallee, newArgs));
        }
      });
  }

  if (parsedComment.implements.length) {
    declaration.implements = parsedComment.implements;
  }

  return declaration;
};

const propertiesFromBody = (body, renameMap) => {
  const properties = [];

  j(body)
    .find(j.Comment)
    .forEach(path => {
      const comment = path.value;

      if (
        !(
          j.CommentBlock.check(comment) &&
          comment.leading &&
          j.ExpressionStatement.check(path.node) &&
          j.AssignmentExpression.check(path.node.expression)
        )
      ) {
        return;
      }

      const propertyKey = getPropertyKey(path.node.expression.left);
      if (!propertyKey) {
        return;
      }

      const parsedComment = parseComment(comment.value, renameMap);
      const classProperty = j.classProperty(
        propertyKey,
        null,
        parsedComment.type
      );
      if (parsedComment.private) {
        classProperty.accessibility = "private";
      }
      properties.push(classProperty);
    });

  return properties;
};

// this.xxx => xxx
const getPropertyKey = node => {
  // this.xxx
  if (j.MemberExpression.check(node) && j.ThisExpression.check(node.object)) {
    return j.identifier(node.property.name || node.property.value);
  }
  return undefined;
};
