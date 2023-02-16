const doc = document

export const nodeOps = {
  insert(child, parent: Element, anchor) {
    parent.insertBefore(child, anchor || null)
  },

  createElement(tag: string): Element {
    return doc.createElement(tag)
  },

  setElementText(el: Element, text: string) {
    el.textContent = text
  },

  remove(child: Element) {
    const parent = child.parentNode
    parent?.removeChild(child)
  },

  createText(text: string) {
    return doc.createTextNode(text)
  },

  setText(node: Element, text: string) {
    node.nodeValue = text
  },

  createComment(text: string) {
    return doc.createComment(text)
  }
}
