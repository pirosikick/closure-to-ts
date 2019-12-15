const nsToCamel = require("../nsToCamel");

test("nsToCamel", () => {
  expect(nsToCamel("app.b")).toBe("appB");
});
