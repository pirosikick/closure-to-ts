const j = require("jscodeshift");
const doctrine = require("@teppeis/doctrine");
const tagTypeToTSType = require("./tagTypeToTSType");
const tagTypeToAnnotation = require("./tagTypeToAnnotation");
const isTagTypeOptional = require("./isTagTypeOptional");
const isTagTypeRest = require("./isTagTypeRest");
const nsToNode = require("./nsToNode");
const typeNameToNode = require("./typeNameToNode");

/**
 * @typedef {object} ParsedComment
 * @property {boolean} interface
 * @property {boolean} constructor
 * @property {boolean} final
 * @property {?boolean} private
 * @property {?boolean} const
 * @property {string=} implements
 * @property {Array.<{ name: string, optional: boolean, rest: boolean, annotation: any }} params
 * @property {any} return
 * @property {any} type
 */

/**
 * @param {string} comment
 * @param {string[]=} nonNullableTypes
 * @return {ParsedComment}
 */
module.exports = function parseComment(comment, nonNullableTypes = []) {
  const parsed = doctrine.parse(comment, { unwrap: true });
  const _nonNullableTypes = [...nonNullableTypes];
  return parsed.tags.sort(sortByTagTitle).reduce(
    (result, tag) => {
      switch (tag.title) {
        case "template": {
          const matched = tag.description.match(/^(\w+)(?:\s+:=\s+(.+)\s+=:)?/);
          if (!matched) {
            return result;
          }

          const name = matched[1];
          const condition = matched[2];
          const param = j.tsTypeParameter(name);

          // cond(isUnknow(T), 'Element', T)
          const conditionMatched =
            condition &&
            condition.match(/cond\(isUnknown\((\w+)\),\s+'(\w+)',\s+(\w+)\)/);
          if (conditionMatched) {
            // T extends unknown ? Element : T
            param.default = j.tsConditionalType(
              j.tsTypeReference(j.identifier(conditionMatched[1])),
              j.tsUnknownKeyword(),
              j.tsTypeReference(j.identifier(conditionMatched[2])),
              j.tsTypeReference(j.identifier(conditionMatched[3]))
            );
          }

          _nonNullableTypes.push(name);
          return {
            ...result,
            templates: [...result.templates, param]
          };
        }

        case "typedef":
          return {
            ...result,
            typedef:
              tag.type && tagTypeToTSType(tag.type, _nonNullableTypes, true)
          };

        case "constructor":
        case "final":
          return {
            ...result,
            [tag.title]: true
          };

        case "interface":
        case "record":
          return {
            ...result,
            interface: true
          };

        case "implements": {
          if (tag.type && tag.type.type === "NameExpression") {
            return {
              ...result,
              implements: [
                ...result.implements,
                j.tsExpressionWithTypeArguments(typeNameToNode(tag.type.name))
              ]
            };
          }

          console.warn("unexpected @implements", tag);
          return result;
        }

        case "extends": {
          if (tag.type && tag.type.type === "NameExpression") {
            return {
              ...result,
              extends: nsToNode(tag.type.name)
            };
          }

          console.warn("unexpected @extends", tag);
          return result;
        }

        case "param": {
          let param = j.identifier(tag.name);
          if (tag.type && isTagTypeRest(tag.type)) {
            param = j.restElement(param);
            param.typeAnnotation =
              tag.type && tagTypeToAnnotation(tag.type, _nonNullableTypes);
          } else {
            param.optional = tag.type && isTagTypeOptional(tag.type);
            param.typeAnnotation =
              tag.type && tagTypeToAnnotation(tag.type, _nonNullableTypes);
          }

          return {
            ...result,
            params: [...result.params, param]
          };
        }

        case "return":
          return {
            ...result,
            return: tag.type
              ? tagTypeToAnnotation(tag.type, _nonNullableTypes)
              : null
          };

        case "type":
          return {
            ...result,
            type: tag.type && tagTypeToAnnotation(tag.type, _nonNullableTypes)
          };

        case "private":
        case "const":
        case "define":
          return {
            ...result,
            [tag.title]: true,
            type:
              (tag.type && tagTypeToAnnotation(tag.type, _nonNullableTypes)) ||
              result.type
          };

        case "enum":
          return tag.type
            ? {
                ...result,
                enum: tagTypeToTSType(tag.type, _nonNullableTypes)
              }
            : result;

        default:
          return result;
      }
    },
    {
      interface: false,
      constructor: false,
      final: false,
      const: false,
      private: false,
      enum: undefined,
      define: false,
      implements: [],
      extends: undefined,
      params: [],
      return: null,
      type: undefined,
      templates: []
    }
  );
};

/**
 * Sort so that @template is first
 *
 * @param {{ title: string }} a
 * @param {{ title: string }} b
 */
const sortByTagTitle = (a, b) => {
  if (
    !a.title ||
    !b.title ||
    a.title === b.title ||
    (a.title !== "template" && b.title !== "template")
  ) {
    return 0;
  } else if (a.title === "template") {
    return -1;
  }
  return 1;
};
