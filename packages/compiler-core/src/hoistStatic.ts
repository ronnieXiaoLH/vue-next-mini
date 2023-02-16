import { NodeTypes } from './ats'

export function isSingleElementRoot(root, child) {
  const { children } = root

  return children.length === 1 && child.type === NodeTypes.ELEMENT
}
