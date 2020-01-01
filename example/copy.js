const path = require("path");
const fs = require("fs");
const globby = require("globby");
const mkdir = require("make-dir");

const extToTS = filePath => {
  const ext = path.extname(filePath);
  return filePath.slice(0, ext.length * -1) + ".ts";
};

const GOOG_PATH = path.join(
  __dirname,
  "node_modules/google-closure-library/closure/goog"
);
const targets = ["base.js", "string/*"];

const paths = globby.sync(targets.map(target => path.join(GOOG_PATH, target)));

paths.forEach(p => {
  const relativePath = extToTS(path.relative(GOOG_PATH, p));
  const to = path.join("src", relativePath);

  mkdir.sync(path.dirname(to));
  fs.createReadStream(p).pipe(fs.createWriteStream(to));
});