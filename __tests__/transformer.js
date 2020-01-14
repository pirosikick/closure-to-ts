const path = require("path");
const { defineTest } = require("jscodeshift/dist/testUtils");

const DEPS = path.resolve(__dirname, "../__testfixtures__/deps.js");

defineTest(__dirname, "transformer", null, "goog-provide");
defineTest(__dirname, "transformer", null, "multi-goog-provide");
defineTest(__dirname, "transformer", null, "goog-require");
defineTest(
  __dirname,
  "transformer",
  { depsPath: DEPS },
  "goog-require-with-deps"
);
defineTest(__dirname, "transformer", null, "jsdoc-to-ts");
defineTest(__dirname, "transformer", null, "goog-provide-and-require");
defineTest(__dirname, "transformer", null, "constructor");
defineTest(__dirname, "transformer", null, "interface");
defineTest(__dirname, "transformer", null, "abstract-class");
defineTest(__dirname, "transformer", null, "super-class");
defineTest(
  __dirname,
  "transformer",
  null,
  "define-variable-without-assignment"
);
defineTest(__dirname, "transformer", null, "typedef");
defineTest(__dirname, "transformer", null, "enum");
defineTest(__dirname, "transformer", null, "non-nullable-types");
defineTest(__dirname, "transformer", null, "define");
defineTest(__dirname, "transformer", null, "type-casting");
