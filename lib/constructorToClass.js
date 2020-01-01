const j = require("jscodeshift");
const addTypeAnnotationToParams = require("./addTypeAnnotationToParams");
const parseComment = require("./parseComment");

module.exports = function constructorToClass(
  functionExpression,
  parsedComment
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
  const properties = propertiesFromBody(functionExpression.body);
  const body = j.classBody([...properties, constructor]);
  return j.classDeclaration(functionExpression.id, body);
};

const propertiesFromBody = body => {
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

      const parsedComment = parseComment(comment.value);
      if (!parsedComment.property) {
        return;
      }

      const classProperty = j.classProperty(
        propertyKey,
        null,
        parsedComment.property.annotation
      );
      classProperty.accessibility = parsedComment.property.accessibility;
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
