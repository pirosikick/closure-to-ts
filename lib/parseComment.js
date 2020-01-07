const j = require("jscodeshift");
const doctrine = require("doctrine");
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
          const name = tag.description.split(" ").shift();
          return {
            ...result,
            templates: [...result.templates, name]
          };
        }

        case "constructor":
        case "final":
        case "interface":
          return {
            ...result,
            [tag.title]: true
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
        case "enum":
        case "define":
          return {
            ...result,
            [tag.title]: true,
            type:
              (tag.type &&
                tagTypeToAnnotation(tag.type, result.templates, renameMap)) ||
              result.type
          };

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
      enum: false,
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
