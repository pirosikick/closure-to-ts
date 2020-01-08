const j = require("jscodeshift");
const rename = require("./rename");

/**
 * @param {{ name: string }} type
 * @param {Array.<string>} templates - @template values
 * @param {Map.<string, string>} renameMap
 * @param {boolean} nonNullable
 */
const tagTypeToTSType = (type, templates, renameMap, nonNullable = false) => {
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
        return nonNullable || templates.includes(name)
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
      tagTypeToTSType(type.expression, templates, renameMap, true),
      j.tsNullKeyword()
    ]);
  }

  if (type.type === "NonNullableType") {
    return tagTypeToTSType(type.expression, templates, renameMap, true);
  }

  if (type.type === "UnionType") {
    const elements = type.elements || [];
    const types = elements.reduce((types, t) => {
      const tsType = tagTypeToTSType(t, templates, renameMap, nonNullable);
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
        tagTypeToTSType(type.applications[0], templates, renameMap, true)
      );
      const valueType = tagTypeToTSType(
        type.applications[1],
        templates,
        renameMap,
        true
      );
      // TODO the second arg of j.tsIndexSignature is typeAnnotation, but can't be set
      const indexSignature = j.tsIndexSignature([keyIdentifier]);
      indexSignature.typeAnnotation = j.tsTypeAnnotation(valueType);
      return j.tsTypeLiteral([indexSignature]);
    }

    const tsType = j.tsTypeReference(
      j.identifier(type.expression.name),
      j.tsTypeParameterInstantiation(
        type.applications.map(t => tagTypeToTSType(t, templates, renameMap))
      )
    );

    return nonNullable ? tsType : j.tsUnionType([tsType, j.tsNullKeyword()]);
  }

  if (type.type === "OptionalType") {
    return tagTypeToTSType(type.expression, templates, renameMap);
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
          ? tagTypeToTSType(type.expression, templates, renameMap)
          : j.tsAnyKeyword()
      ])
    );
  }

  if (type.type === "FunctionType") {
    const params = (type.params || []).map((p, i) => {
      const id = j.identifier(`arg${i}`);
      id.typeAnnotation = j.tsTypeAnnotation(
        tagTypeToTSType(p, templates, renameMap)
      );
      return id;
    });
    const functionType = j.tsFunctionType(params);
    if (type.result) {
      functionType.typeAnnotation = j.tsTypeAnnotation(
        tagTypeToTSType(type.result, templates, renameMap)
      );
    }

    return functionType;
  }

  if (type.type === "RecordType") {
    const members = type.fields.map(field => {
      const key = j.identifier(field.key);
      return j.tsPropertySignature(
        key,
        j.tsTypeAnnotation(tagTypeToTSType(field.value, templates, renameMap))
      );
    });
    return j.tsTypeLiteral(members);
  }

  throw new Error(`Unexpected type: ${type.type}`);
};

module.exports = tagTypeToTSType;
