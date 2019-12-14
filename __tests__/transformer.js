const { defineTest } = require("jscodeshift/dist/testUtils");

defineTest(__dirname, "transformer", null, "goog-provide");
defineTest(__dirname, "transformer", null, "goog-provide-to-export-default");
