const j = require("jscodeshift");

module.exports = function tagTypeToAnnotation(type, wrapAnnotation = false) {
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
      case "null":
        return j.tsNullKeyword();
      default:
        const tsType = j.tsTypeReference(j.identifier(type.name));
        return nonNullable
          ? tsType
          : j.tsUnionType([tsType, j.tsNullKeyword()]);
    }
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

  throw new Error(`Unexpected type: ${type.type}`);
};
