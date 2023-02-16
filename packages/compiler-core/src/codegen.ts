import { isArray, isString } from '@vue/shared'
import { NodeTypes } from './ats'
import { helperNameMap, TO_DISPLAY_STRING } from './runtimeHelpers'
import { getVNodeHelper } from './utils'

const aliasHelper = (s: symbol) => `${helperNameMap[s]}: _${helperNameMap[s]}`

function createCodegenContext(ast) {
  const context = {
    code: ``,
    runtimeGlobalName: 'Vue',
    source: ast.loc.source,
    indentLevel: 0,
    isSSR: false,
    helper(key) {
      return `_${helperNameMap[key]}`
    },
    push(code) {
      context.code += code
    },
    newline() {
      newline(context.indentLevel)
    },
    indent() {
      newline(++context.indentLevel)
    },
    deindent() {
      newline(--context.indentLevel)
    }
  }

  function newline(n: number) {
    context.code += '\n' + `  `.repeat(n)
  }

  return context
}

export function generate(ast) {
  const context = createCodegenContext(ast)

  const { push, newline, indent, deindent } = context

  // 1. 处理前置代码
  genFunctionPreamble(context)
  // 2. 构建函数名和参数
  const functionName = `render`
  const args = ['_ctx', '_cache']
  const signature = args.join(', ')
  push(`function ${functionName}(${signature}) {`)
  indent()
  // 3. 构建函数体
  push(`with (_ctx) {`)
  indent()

  const hasHelpers = ast.helpers.length > 0
  if (hasHelpers) {
    push(`const { ${ast.helpers.map(aliasHelper).join(', ')} } = _Vue`)
    push('\n')
    newline()
  }

  // newline()
  push('return ')

  if (ast.codegenNode) {
    genNode(ast.codegenNode, context)
  } else {
    push('null')
  }

  deindent()
  push('}')

  deindent()
  push('}')

  return {
    ast,
    code: context.code
  }
}

function genFunctionPreamble(context) {
  const { push, newline, runtimeGlobalName } = context
  const VueBinding = runtimeGlobalName
  push(`const _Vue = ${VueBinding}`)
  newline()
  push(`return `)
}

function genNode(node, context) {
  switch (node.type) {
    case NodeTypes.VNODE_CALL:
      genVNodeCall(node, context)
      break
    case NodeTypes.TEXT:
      genText(node, context)
      break
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context)
      break
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context)
      break
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context)
      break
    case NodeTypes.ELEMENT:
      genNode(node.codegenNode, context)

    default:
      break
  }
}

function genCompoundExpression(node, context) {
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i]
    if (isString(child)) {
      context.push(child)
    } else {
      genNode(child, context)
    }
  }
}

function genInterpolation(node, context) {
  const { push, helper } = context
  push(`${helper(TO_DISPLAY_STRING)}(`)
  genNode(node.content, context)
  push(')')
}

function genExpression(node, context) {
  const { content, isStatic } = node
  context.push(isStatic ? JSON.stringify(content) : content)
}

function genVNodeCall(node, context) {
  const { push, helper, isSSR } = context
  const {
    tag,
    props,
    children,
    patchFlag,
    dynamicProps,
    directives,
    isBlock,
    disableTracking,
    isComponent
  } = node

  const callHelper = getVNodeHelper(isSSR, isComponent)
  push(helper(callHelper) + '(')

  // 处理函数参数
  const args = genNullableArgs([tag, props, children, patchFlag, dynamicProps])
  genNodeList(args, context)

  push(')')
}

function genText(node, context) {
  context.push(JSON.stringify(node.content))
}

function genNullableArgs(args: any[]) {
  let i = args.length
  // 从数组尾部开始按顺序处理，剔除掉为 null 的参数
  while (i--) {
    if (args[i] != null) break
  }

  return args.slice(0, i + 1).map(arg => arg || 'null')
}

function genNodeList(nodes, context) {
  const { push, newline } = context

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (isString(node)) {
      push(node)
    } else if (isArray(node)) {
      genNodeListAsArray(node, context)
    } else {
      genNode(node, context)
    }

    // 逗号分割参数
    if (i < nodes.length - 1) {
      push(', ')
    }
  }
}

function genNodeListAsArray(nodes, context) {
  context.push('[')
  genNodeList(nodes, context)
  context.push(']')
}
