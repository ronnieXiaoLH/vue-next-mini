import { NodeTypes } from '../ats'
import { isText } from '../utils'

// 将文本和 {{}} 包裹的表达式 拼接成一个新的 表达式
export const transformText = (node, context) => {
  if (
    node.type === NodeTypes.ROOT ||
    node.type === NodeTypes.ELEMENT ||
    node.type === NodeTypes.FOR ||
    node.type === NodeTypes.IF_BRANCH
  ) {
    return () => {
      const children = node.children
      let currentContainer

      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (isText(child)) {
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j]
            if (isText(next)) {
              if (!currentContainer) {
                currentContainer = children[i] = createCompoundExpression(
                  [child],
                  child.loc
                )
              }
              currentContainer.children.push(` +`, next)
              // children[j] 已经被拼接到 children[i] 中，可以删掉了
              children.splice(j, 1)
              j--
            } else {
              currentContainer = undefined
              break
            }
          }
        }
      }
    }
  }
}

export function createCompoundExpression(children, loc) {
  return {
    type: NodeTypes.COMPOUND_EXPRESSION,
    loc,
    children
  }
}
