const j = require("jscodeshift");

module.exports = function tagTypeToAnnotation(type) {
  const tsType = tagTypeToTSType(type);
  return j.tsTypeAnnotation(tsType);
};

const tagTypeToTSType = (type, nonNullable = false) => {
  if (type.type === "NameExpression") {
    switch (type.name) {
      case "boolean":
        return j.tsBooleanKeyword();
      case "string":
        return j.tsStringKeyword();
      case "number":
        return j.tsNumberKeyword();
      default:
        const tsType = j.tsTypeReference(j.identifier(type.name));
        return nonNullable
          ? tsType
          : j.tsUnionType([tsType, j.tsNullKeyword()]);
    }
  }

  if (type.type === "NullLiteral") {
    return j.tsNullKeyword();
  }

  if (type.type === "UndefinedLiteral") {
    return j.tsUndefinedKeyword();
  }

  if (type.type === "NonNullableType") {
    return tagTypeToTSType(type.expression, true);
  }

  if (type.type === "UnionType") {
    const elements = type.elements || [];
    const types = elements.reduce((types, t) => {
      const tsType = tagTypeToTSType(t);
      return j.TSUnionType.check(tsType)
        ? [...types, ...tsType.types]
        : [...types, tsType];
    }, []);

    return j.tsUnionType(types);
  }

  if (type.type === "TypeApplication") {
    const tsType = j.tsTypeReference(
      j.identifier(type.expression.name),
      j.tsTypeParameterInstantiation(
        type.applications.map(t => tagTypeToTSType(t))
      )
    );

    return nonNullable ? tsType : j.tsUnionType([tsType, j.tsNullKeyword()]);
  }

  if (type.type === "OptionalType") {
    return tagTypeToTSType(type.expression);
  }

  if (type.type === "AllLiteral") {
    return j.tsUnknownKeyword();
  }

  if (type.type === "NullableLiteral") {
    return j.tsAnyKeyword();
  }

  throw new Error(`Unexpected type: ${type.type}`);
};
