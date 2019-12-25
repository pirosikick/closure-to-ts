const path = require("path");
const { defineTest } = require("jscodeshift/dist/testUtils");

const DEPS = path.resolve(__dirname, "../__testfixtures__/deps.js");

defineTest(__dirname, "transformer", null, "goog-provide");
defineTest(__dirname, "transformer", null, "goog-provide-to-export-default");
defineTest(__dirname, "transformer", null, "multi-goog-provide");
defineTest(__dirname, "transformer", null, "goog-require");
defineTest(
  __dirname,
  "transformer",
  { depsPath: DEPS },
  "goog-require-with-deps"
);
