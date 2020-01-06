const path = require("path");
const fs = require("fs");
const { parser } = require("google-closure-deps");

const importPath = require("../importPath");

test("importPath", () => {
  const depsPath = path.resolve(__dirname, "../../__testfixtures__/deps.js");
  const deps = fs.readFileSync(depsPath).toString("utf8");
  const { dependencies } = parser.parseDependencyFile(
    deps,
    path.dirname(depsPath)
  );

  expect(importPath(dependencies, "app.a", "app.b", depsPath)).toBe("./b");
  expect(importPath(dependencies, "app.a", "app.b.c", depsPath)).toBe("./b/c");
  expect(importPath(dependencies, "app.a", "hoge.d", depsPath)).toBe(
    "../hoge/d"
  );
});
