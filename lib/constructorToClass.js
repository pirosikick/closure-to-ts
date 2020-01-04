const j = require("jscodeshift");
const addTypeAnnotationToParams = require("./addTypeAnnotationToParams");
const parseComment = require("./parseComment");

module.exports = function constructorToClass(
  functionExpression,
  parsedComment,
  renameMap
) {
  const params = addTypeAnnotationToParams(
    functionExpression.params,
    parsedComment
  );
  const constructor = j.classMethod(
    "constructor",
    j.identifier("constructor"),
    params,
    functionExpression.body
  );
  const properties = propertiesFromBody(functionExpression.body, renameMap);
  const body = j.classBody([...properties, constructor]);
  const declaration = j.classDeclaration(functionExpression.id, body);

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
