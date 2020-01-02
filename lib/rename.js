const rename = (renameMap, name) => {
  const entry = Array.from(renameMap.entries())
    .filter(entry => name === entry[0] || name.indexOf(`${entry[0]}.`) === 0)
    .sort((a, b) => b[0].length - a[0].length)
    .shift();

  if (!entry) {
    return name;
  }

  if (entry[0] === name) {
    return entry[1];
  }

  const remain = name.slice(`${entry[0]}.`.length);
  return entry[1] ? [entry[1], remain].join(".") : remain;
};

module.exports = rename;
