const j = require("jscodeshift");
const doctrine = require("@teppeis/doctrine");
const tagTypeToAnnotation = require("./tagTypeToAnnotation");

module.exports = function parseComment(comment) {
  const parsed = doctrine.parse(comment, { unwrap: true });
  return parsed.tags.reduce(
    (result, tag) => {
      if (!tag.type) {
        return result;
      }

      switch (tag.title) {
        case "param":
          return {
            ...result,
            params: [
              ...result.params,
              { name: tag.name, annotation: tagTypeToAnnotation(tag.type) }
            ]
          };
        case "return":
          return {
            ...result,
            return: tagTypeToAnnotation(tag.type)
          };
        default:
          return result;
      }
    },
    {
      params: [],
      return: undefined
    }
  );
};
