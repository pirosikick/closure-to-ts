const j = require("jscodeshift");
const doctrine = require("doctrine");
const tagTypeToAnnotation = require("./tagTypeToAnnotation");
const isTagTypeOptional = require("./isTagTypeOptional");
const isTagTypeRest = require("./isTagTypeRest");

module.exports = function parseComment(comment) {
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
            implements: tag.type && tag.type.name
          };

        case "param":
          return {
            ...result,
            params: [
              ...result.params,
              {
                name: tag.name,
                annotation: tag.type && tagTypeToAnnotation(tag.type),
                optional: tag.type && isTagTypeOptional(tag.type),
                rest: tag.type && isTagTypeRest(tag.type)
              }
            ]
          };

        case "return":
          return {
            ...result,
            return: tag.type && tagTypeToAnnotation(tag.type)
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
        annotation: privateTag.type && tagTypeToAnnotation(privateTag.type)
      }
    };

    const constTag = findTag(parsed.tags, "const");
    if (!result.annotation && constTag && constTag.type) {
      result.property.annotation = tagTypeToAnnotation(constTag.type);
    }
  }

  return result;
};

const findTag = (tags, title) => {
  return tags.find(tag => tag.title === title);
};
