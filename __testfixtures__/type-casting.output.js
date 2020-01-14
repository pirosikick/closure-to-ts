function hoge (node) {
  return node.nodeType == NodeType.ELEMENT ? node as Element | null : node.parentNode as Element | null;
}
