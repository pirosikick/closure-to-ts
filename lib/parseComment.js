const j = require("jscodeshift");
const doctrine = require("doctrine");
const tagTypeToAnnotation = require("./tagTypeToAnnotation");
const isTagTypeOptional = require("./isTagTypeOptional");
const isTagTypeRest = require("./isTagTypeRest");
const rename = require("./rename");

/**
 * @typedef {object} ParsedComment
 * @property {boolean} constructor
 * @property {boolean} final
 * @property {string=} implements
 * @property {Array.<{ name: string, optional: boolean, rest: boolean, annotation: any }} params
 * @property {any} return
 * @property {{ accessibility: string, annotation: any }} property
 */

/**
 * @param {string} comment
 * @param {Map.<string, string>} renameMap
 * @return {ParsedComment}
 */
module.exports = function parseComment(comment, renameMap) {
  const parsed = doctrine.parse(comment, { unwrap: true });
  let result = parsed.tags.reduce(
    (result, tag) => {
      switch (tag.title) {
        case "constructor":
        case "final":
          return {
            ...result,
            [tag.title]: true
          };

        case "implements":
          return {
            ...result,
            implements: tag.type && rename(renameMap, tag.type.name)
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

        default:
          return result;
      }
    },
    {
      constructor: false,
      final: false,
      implements: undefined,
      property: undefined,
      params: [],
      return: undefined
    }
  );

  const privateTag = findTag(parsed.tags, "private");
  if (privateTag) {
    result = {
      ...result,
      property: {
        accessibility: "private",
        annotation:
          privateTag.type && tagTypeToAnnotation(privateTag.type, renameMap)
      }
    };

    const constTag = findTag(parsed.tags, "const");
    if (!result.annotation && constTag && constTag.type) {
      result.property.annotation = tagTypeToAnnotation(
        constTag.type,
        renameMap
      );
    }
  }

  return result;
};

/**
 * @param {Array.<{ title: string >}} tags
 * @param {string} title
 */
const findTag = (tags, title) => tags.find(tag => tag.title === title);
