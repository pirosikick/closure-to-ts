const j = require("jscodeshift");
const typeNameToNode = require("./typeNameToNode");

const typeNameMap = {
  IArrayLike: "ArrayLike",
  Arguments: "IArguments"
};

/**
 * @param {{ name: string }} type
 * @param {Array<string>=} nonNullableTypes - @template values
 */
const tagTypeToTSType = (type, nonNullableTypes = [], nonNullable = false) => {
  if (type.type === "NameExpression") {
    switch (type.name) {
      case "boolean":
        return j.tsBooleanKeyword();
      case "string":
        return j.tsStringKeyword();
      case "number":
        return j.tsNumberKeyword();
      case "void":
        return j.tsVoidKeyword();
      default: {
        const name = typeNameMap[type.name] || type.name;
        const tsType = j.tsTypeReference(typeNameToNode(name));
        return nonNullable || nonNullableTypes.includes(name)
          ? tsType
          : j.tsUnionType([tsType, j.tsNullKeyword()]);
      }
    }
  }

  if (type.type === "VoidLiteral") {
    return j.tsVoidKeyword();
  }

  if (type.type === "NullLiteral") {
    return j.tsNullKeyword();
  }

  if (type.type === "UndefinedLiteral") {
    return j.tsUndefinedKeyword();
  }

  if (type.type === "NullableType") {
    return j.tsUnionType([
      tagTypeToTSType(type.expression, nonNullableTypes, true),
      j.tsNullKeyword()
    ]);
  }

  if (type.type === "NonNullableType") {
    return tagTypeToTSType(type.expression, nonNullableTypes, true);
  }

  if (type.type === "UnionType") {
    const elements = type.elements || [];
    const types = elements.reduce((types, t) => {
      let tsType = tagTypeToTSType(t, nonNullableTypes, nonNullable);

      // `(...) => ...` -> `((...) => ...)`
      if (j.TSFunctionType.check(tsType)) {
        tsType = j.tsParenthesizedType(tsType);
      }

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
        tagTypeToTSType(type.applications[0], nonNullableTypes, true)
      );
      const valueType = tagTypeToTSType(
        type.applications[1],
        nonNullableTypes,
        true
      );
      // TODO the second arg of j.tsIndexSignature is typeAnnotation, but can't be set
      const indexSignature = j.tsIndexSignature([keyIdentifier]);
      indexSignature.typeAnnotation = j.tsTypeAnnotation(valueType);
      return j.tsTypeLiteral([indexSignature]);
    }

    const tsType = tagTypeToTSType(type.expression, nonNullableTypes, true);
    tsType.typeParameters = j.tsTypeParameterInstantiation(
      type.applications.map(t => tagTypeToTSType(t, nonNullableTypes, true))
    );

    return nonNullable ? tsType : j.tsUnionType([tsType, j.tsNullKeyword()]);
  }

  if (type.type === "OptionalType") {
    return tagTypeToTSType(type.expression, nonNullableTypes);
  }

  if (type.type === "AllLiteral" || type.type === "NullableLiteral") {
    return j.tsAnyKeyword();
  }

  if (type.type === "RestType") {
    // Array<...>
    return j.tsTypeReference(
      j.identifier("Array"),
      j.tsTypeParameterInstantiation([
        type.expression
          ? tagTypeToTSType(type.expression, nonNullableTypes)
          : j.tsAnyKeyword()
      ])
    );
  }

  if (type.type === "FunctionType") {
    const params = (type.params || []).map((p, i) => {
      const id = j.identifier(`arg${i}`);
      id.typeAnnotation = j.tsTypeAnnotation(
        tagTypeToTSType(p, nonNullableTypes)
      );
      return id;
    });
    const functionType = j.tsFunctionType(params);
    if (type.result) {
      functionType.typeAnnotation = j.tsTypeAnnotation(
        tagTypeToTSType(type.result, nonNullableTypes)
      );
    }

    return functionType;
  }

  if (type.type === "RecordType") {
    const members = type.fields.map(field => {
      const key = j.identifier(field.key);
      return j.tsPropertySignature(
        key,
        j.tsTypeAnnotation(tagTypeToTSType(field.value, nonNullableTypes))
      );
    });
    return j.tsTypeLiteral(members);
  }

  throw new Error(`Unexpected type: ${type.type}`);
};

module.exports = tagTypeToTSType;
