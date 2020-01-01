const j = require("jscodeshift");
const doctrine = require("@teppeis/doctrine");
const tagTypeToAnnotation = require("./tagTypeToAnnotation");
const isTagTypeOptional = require("./isTagTypeOptional");
const isTagTypeRest = require("./isTagTypeRest");

module.exports = function parseComment(comment) {
  const parsed = doctrine.parse(comment, { unwrap: true });
  return parsed.tags.reduce(
    (result, tag) => {
      if (tag.title === "constructor") {
        return {
          ...result,
          constructor: true
        };
      }

      if (!tag.type) {
        return result;
      }

      switch (tag.title) {
        case "param":
          return {
            ...result,
            params: [
              ...result.params,
              {
                name: tag.name,
                annotation: tagTypeToAnnotation(tag.type),
                optional: isTagTypeOptional(tag.type),
                rest: isTagTypeRest(tag.type)
              }
            ]
          };

        case "return":
          return {
            ...result,
            return: tagTypeToAnnotation(tag.type)
          };

        case "private":
          return {
            ...result,
            property: {
              accessibility: "private",
              annotation: tagTypeToAnnotation(tag.type)
            }
          };

        default:
          return result;
      }
    },
    {
      constructor: false,
      property: undefined,
      params: [],
      return: undefined
    }
  );
};
