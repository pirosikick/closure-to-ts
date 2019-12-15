const path = require("path");
const loadDeps = require("../loadDeps");

test("loadDeps", () => {
  const { dependencies } = loadDeps(
    path.resolve(__dirname, "../../__testfixtures__/deps.js")
  );

  expect(dependencies.length).toBe(2);
});
