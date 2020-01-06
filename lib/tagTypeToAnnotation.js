const j = require("jscodeshift");
const rename = require("./rename");

module.exports = function tagTypeToAnnotation(type, renameMap) {
  const tsType = tagTypeToTSType(type, renameMap);
  return j.tsTypeAnnotation(tsType);
};

const tagTypeToTSType = (type, renameMap, nonNullable = false) => {
  if (type.type === "NameExpression") {
    switch (type.name) {
      case "boolean":
        return j.tsBooleanKeyword();
      case "string":
        return j.tsStringKeyword();
      case "number":
        return j.tsNumberKeyword();
      default: {
        const name = rename(renameMap, type.name);
        const tsType = j.tsTypeReference(j.identifier(name));
        return nonNullable
          ? tsType
          : j.tsUnionType([tsType, j.tsNullKeyword()]);
      }
    }
  }

  if (type.type === "NullLiteral") {
    return j.tsNullKeyword();
  }

  if (type.type === "UndefinedLiteral") {
    return j.tsUndefinedKeyword();
  }

  if (type.type === "NullableType") {
    return j.tsUnionType([
      tagTypeToTSType(type.expression, renameMap, true),
      j.tsNullKeyword()
    ]);
  }

  if (type.type === "NonNullableType") {
    return tagTypeToTSType(type.expression, renameMap, true);
  }

  if (type.type === "UnionType") {
    const elements = type.elements || [];
    const types = elements.reduce((types, t) => {
      const tsType = tagTypeToTSType(t, renameMap);
      return j.TSUnionType.check(tsType)
        ? [...types, ...tsType.types]
        : [...types, tsType];
    }, []);

    return j.tsUnionType(types);
  }

  if (type.type === "TypeApplication") {
    if (type.expression.name === "Object" && type.applications.length === 2) {
      // { [key: ...]: ... }
      const keyIdentifier = j.identifier("key");
      keyIdentifier.typeAnnotation = j.tsTypeAnnotation(
        tagTypeToTSType(type.applications[0], renameMap, true)
      );
      const valueType = tagTypeToTSType(type.applications[1], renameMap, true);
      // TODO the second arg of j.tsIndexSignature is typeAnnotation, but can't be set
      const indexSignature = j.tsIndexSignature([keyIdentifier]);
      indexSignature.typeAnnotation = j.tsTypeAnnotation(valueType);
      return j.tsTypeLiteral([indexSignature]);
    }

    const tsType = j.tsTypeReference(
      j.identifier(type.expression.name),
      j.tsTypeParameterInstantiation(
        type.applications.map(t => tagTypeToTSType(t, renameMap))
      )
    );

    return nonNullable ? tsType : j.tsUnionType([tsType, j.tsNullKeyword()]);
  }

  if (type.type === "OptionalType") {
    return tagTypeToTSType(type.expression, renameMap);
  }

  if (type.type === "AllLiteral" || type.type === "NullableLiteral") {
    return j.tsAnyKeyword();
  }

  if (type.type === "RestType") {
    // Array<...>
    return j.tsTypeReference(
      j.identifier("Array"),
      j.tsTypeParameterInstantiation([
        tagTypeToTSType(type.expression, renameMap)
      ])
    );
  }

  if (type.type === "FunctionType") {
    const params = (type.params || []).map((p, i) => {
      const id = j.identifier(`arg${i}`);
      id.typeAnnotation = j.tsTypeAnnotation(tagTypeToTSType(p, renameMap));
      return id;
    });
    const functionType = j.tsFunctionType(params);
    functionType.typeAnnotation = j.tsTypeAnnotation(
      tagTypeToTSType(type.result, renameMap)
    );

    return functionType;
  }

  throw new Error(`Unexpected type: ${type.type}`);
};
