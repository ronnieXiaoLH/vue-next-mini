import { NodeTypes } from '../ats'
import {
  createStructuralDirectiveTransforms,
  TransformContext
} from '../transform'

export const transformIf = createStructuralDirectiveTransforms(
  /^(if|else|else-if)$/,
  (node, dir, context) => {
    return processIf(node, dir, context, (ifNode, branch, isRoot) => {
      let key = 0

      return () => {
        if (isRoot) {
          ifNode.codegenNode = createCodegenNodeForBranch(branch, key, context)
        }
      }
    })
  }
)

function createCodegenNodeForBranch(
  branch,
  keyIndex,
  context: TransformContext
) {
  if (branch.condition) {
    return
  }
}

export function processIf(
  node,
  dir,
  context: TransformContext,
  processCodegen?: (node, branch, isRoot: boolean) => () => void
) {
  if (dir.name === 'if') {
    const branch = createIfBranch(node, dir)

    const ifNode = {
      type: NodeTypes.IF,
      loc: {},
      branches: [branch]
    }

    context.replaceNode(ifNode)

    if (processCodegen) {
      return processCodegen(ifNode, branch, true)
    }
  }
  return () => {}
}

function createIfBranch(node, dir) {
  return {
    type: NodeTypes.IF_BRANCH,
    loc: {},
    condition: dir.exp,
    children: [node]
  }
}
