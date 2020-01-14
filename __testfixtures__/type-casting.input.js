function hoge (node) {
  return (
    /** @type {Element} */ node.nodeType == NodeType.ELEMENT ? node : node.parentNode
  );
}
