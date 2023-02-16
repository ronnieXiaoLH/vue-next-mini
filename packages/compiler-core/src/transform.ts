import { isString } from '@vue/shared'
import { NodeTypes } from './ats'
import { isSingleElementRoot } from './hoistStatic'
import { TO_DISPLAY_STRING } from './runtimeHelpers'

export interface TransformContext {
  root
  parent: ParentNode | null
  childIndex: number
  currentNode
  helpers: Map<symbol, number>
  helper<T extends symbol>(name: T): T
  nodeTransforms: any[]
  replaceNode(node): void
}

export function createTransformContext(root, { nodeTransforms = [] }) {
  const context: TransformContext = {
    root,
    parent: null,
    childIndex: 0,
    currentNode: root,
    helpers: new Map(),
    helper(name) {
      const count = context.helpers.get(name) || 0
      context.helpers.set(name, count + 1)
      return name
    },
    nodeTransforms,
    replaceNode(node) {
      context.parent!.children[context.childIndex] = context.currentNode = node
    }
  }

  return context
}

export function transform(root, options) {
  const context = createTransformContext(root, options)
  traverseNode(root, context)
  createRootCodegen(root)

  root.helpers = [...context.helpers.keys()]
  root.components = []
  root.directives = []
  root.imports = []
  root.temps = []
  root.cached = []
}

export function traverseNode(node, context: TransformContext) {
  context.currentNode = node
  const { nodeTransforms } = context
  const exitFns: any[] = []

  for (let i = 0; i < nodeTransforms.length; i++) {
    // nodeTransforms 是各种类型的节点的转换方法，只有符合对应的条件时，才会返回对应的函数
    const onExit = nodeTransforms[i](node, context)
    if (onExit) {
      exitFns.push(onExit)
    }
  }

  switch (node.type) {
    case NodeTypes.ELEMENT:
    case NodeTypes.ROOT:
      traverseChildren(node, context)
      break
    case NodeTypes.INTERPOLATION:
      context.helper(TO_DISPLAY_STRING)
      break

    default:
      break
  }

  context.currentNode = node
  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }
}

export function traverseChildren(parent, context: TransformContext) {
  parent.children.forEach((node, index) => {
    context.parent = parent
    context.childIndex = index
    traverseNode(node, context)
  })
}

function createRootCodegen(root) {
  const { children } = root

  if (children.length === 1) {
    const child = children[0]
    if (isSingleElementRoot(root, child) && child.codegenNode) {
      root.codegenNode = child.codegenNode
    }
  }
}

export function createStructuralDirectiveTransforms(name: string | RegExp, fn) {
  const matches = isString(name)
    ? (n: string) => n === name
    : (n: string) => name.test(n)

  return (node, context) => {
    if (node.type === NodeTypes.ELEMENT) {
      const exitFns: any = []
      const { props } = node

      for (let i = 0; i < props.length; i++) {
        const prop = props[i]
        if (prop.type === NodeTypes.DIRECTIVE && matches(prop.name)) {
          // 把指定对应 prop 从 props 中剔除
          props.splice(i, 1)
          i--
          const onExit = fn(node, prop, context)
          if (onExit) {
            exitFns.push(onExit)
          }
        }
      }

      return exitFns
    }
  }
}
