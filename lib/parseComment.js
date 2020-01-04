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
  return parsed.tags.reduce(
    (result, tag) => {
      switch (tag.title) {
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

        case "param":
          return {
            ...result,
            params: [
              ...result.params,
              {
                name: tag.name,
                annotation:
                  tag.type && tagTypeToAnnotation(tag.type, renameMap),
                optional: tag.type && isTagTypeOptional(tag.type),
                rest: tag.type && isTagTypeRest(tag.type)
              }
            ]
          };

        case "return":
          return {
            ...result,
            return: tag.type && tagTypeToAnnotation(tag.type, renameMap)
          };

        case "type":
          return {
            ...result,
            type: tag.type && tagTypeToAnnotation(tag.type, renameMap)
          };

        case "private":
          return {
            ...result,
            private: true,
            type:
              (tag.type && tagTypeToAnnotation(tag.type, renameMap)) ||
              result.type
          };

        case "const":
          return {
            ...result,
            const: true,
            type:
              (tag.type && tagTypeToAnnotation(tag.type, renameMap)) ||
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
      implements: [],
      params: [],
      return: undefined,
      type: undefined
    }
  );
};

/**
 * @param {Array.<{ title: string >}} tags
 * @param {string} title
 */
const findTag = (tags, title) => tags.find(tag => tag.title === title);
