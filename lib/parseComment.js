const j = require("jscodeshift");
const doctrine = require("@teppeis/doctrine");
const tagTypeToTSType = require("./tagTypeToTSType");
const tagTypeToAnnotation = require("./tagTypeToAnnotation");
const isTagTypeOptional = require("./isTagTypeOptional");
const isTagTypeRest = require("./isTagTypeRest");
const rename = require("./rename");

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
 * @param {Map.<string, string>} renameMap
 * @return {ParsedComment}
 */
module.exports = function parseComment(comment, renameMap) {
  const parsed = doctrine.parse(comment, { unwrap: true });
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

          return {
            ...result,
            templates: [...result.templates, param]
          };
        }

        case "typedef":
          return {
            ...result,
            typedef:
              tag.type &&
              tagTypeToTSType(tag.type, result.templates, renameMap, true)
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

        case "implements":
          return {
            ...result,
            implements: [
              ...result.implements,
              j.tsExpressionWithTypeArguments(
                j.identifier(rename(renameMap, tag.type.name))
              )
            ]
          };

        case "extends":
          return {
            ...result,
            extends: j.identifier(rename(renameMap, tag.type.name))
          };

        case "param": {
          let param = j.identifier(tag.name);
          if (tag.type && isTagTypeRest(tag.type)) {
            param = j.restElement(param);
            param.typeAnnotation =
              tag.type &&
              tagTypeToAnnotation(tag.type, result.templates, renameMap);
          } else {
            param.optional = tag.type && isTagTypeOptional(tag.type);
            param.typeAnnotation =
              tag.type &&
              tagTypeToAnnotation(tag.type, result.templates, renameMap);
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
              ? tagTypeToAnnotation(tag.type, result.templates, renameMap)
              : null
          };

        case "type":
          return {
            ...result,
            type:
              tag.type &&
              tagTypeToAnnotation(tag.type, result.templates, renameMap)
          };

        case "private":
        case "const":
        case "define":
          return {
            ...result,
            [tag.title]: true,
            type:
              (tag.type &&
                tagTypeToAnnotation(tag.type, result.templates, renameMap)) ||
              result.type
          };

        case "enum":
          return tag.type
            ? {
                ...result,
                enum: tagTypeToTSType(tag.type, result.templates, renameMap)
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
