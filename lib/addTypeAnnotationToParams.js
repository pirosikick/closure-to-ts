const j = require("jscodeshift");

const addTypeAnnotationToParams = (params, parsedComment) => {
  if (!parsedComment.params.length) {
    return params;
  }

  return params.map(param => {
    const p = parsedComment.params.find(p => p.name === param.name);
    if (!p) {
      return { ...param };
    }

    if (p.rest) {
      const newParam = j.restElement(param);
      newParam.typeAnnotation = p.annotation;
      return newParam;
    }

    return {
      ...param,
      typeAnnotation: p.annotation,
      optional: p.optional
    };
  });
};

module.exports = addTypeAnnotationToParams;
