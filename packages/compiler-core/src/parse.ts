import { ElementTypes, NodeTypes } from './ats'

export interface ParserContext {
  source: string
}

export const enum TagType {
  Start,
  End
}

function createParserContext(content: string): ParserContext {
  return {
    source: content
  }
}

export function createRoot(children) {
  return {
    type: NodeTypes.ROOT,
    children,
    loc: {}
  }
}

export function baseParse(content: string) {
  const context = createParserContext(content)

  const children = parseChildren(context, [])

  const root = createRoot(children)

  return root
}

function parseChildren(context: ParserContext, ancestors) {
  const nodes = []

  // 不是结束标签
  while (!isEnd(context, ancestors)) {
    const s = context.source

    let node

    if (startsWith(s, '{{')) {
      node = parseInterpolation(context)
    } else if (s[0] === '<') {
      if (/[a-z]/i.test(s[1])) {
        // 开始标签
        node = parseElement(context, ancestors)
      }
    }

    // 不满足上述两种情况，只能是文本了
    if (!node) {
      node = parseText(context)
    }

    pushNode(nodes, node)
  }

  return nodes
}

function parseInterpolation(context: ParserContext) {
  const [open, close] = ['{{', '}}']

  advanceBy(context, open.length)

  const closeIndex = context.source.indexOf(close)
  const preTrimContent = parseTextData(context, closeIndex)
  const content = preTrimContent.trim()

  advanceBy(context, close.length)

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      isStatic: false,
      content
    }
  }
}

function parseElement(context: ParserContext, ancestors) {
  const element = parseTag(context, TagType.Start)
  ancestors.push(element)

  const children = parseChildren(context, ancestors)
  element.children = children

  ancestors.pop()

  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End)
  }

  return element
}

function parseTag(context: ParserContext, type: TagType) {
  const match = /^<\/?([a-z][^\r\n\t\f />]*)/i.exec(
    context.source
  ) as RegExpExecArray
  const tag = match[1]

  advanceBy(context, match[0].length)

  // 处理属性
  // 1. 处理属性前的空格
  advanceSpaces(context)
  // 2. 处理属性
  const props = parseAttributes(context, type)

  // 判断是否是自闭合标签
  const isSelfClosing = startsWith(context.source, '/>')
  advanceBy(context, isSelfClosing ? 2 : 1)

  return {
    type: NodeTypes.ELEMENT,
    tag,
    tagType: ElementTypes.ELEMENT,
    children: [],
    props
  }
}

function parseAttributes(context: ParserContext, type: TagType) {
  const props: any = []
  const attributeNames = new Set<string>()

  while (
    context.source.length > 0 &&
    !startsWith(context.source, '>') &&
    !startsWith(context.source, '/>')
  ) {
    const attr = parseAttribute(context, attributeNames)
    if (type === TagType.Start) {
      props.push(attr)
    }
    // 没处理完一个属性，都要先处理属性前面的空格
    advanceSpaces(context)
  }

  return props
}

function parseAttribute(context: ParserContext, nameSet: Set<string>) {
  const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)!
  console.log(match)
  const name = match[0]
  nameSet.add(name)
  advanceBy(context, name.length)

  // 处理属性的值
  let value
  if (/^[\t\r\n\f ]*=/.test(context.source)) {
    advanceSpaces(context)
    // 去掉 =
    advanceBy(context, 1)
    advanceSpaces(context)
    value = parseAttributeValue(context)
  }

  // 如果是 v- 开头的指令
  if (/^(v-[A-Za-z0-9-]|:|\.|@|#)/.test(name)) {
    const match =
      /(?:^v-([a-z0-9-]+))?(?:(?::|^\.|^@|^#)(\[[^\]]+\]|[^\.]+))?(.+)?$/i.exec(
        name
      )!
    let dirName = match[1]

    return {
      type: NodeTypes.DIRECTIVE,
      name: dirName,
      exp: value && {
        type: NodeTypes.SIMPLE_EXPRESSION,
        context: value.content,
        isStatic: false,
        loc: {}
      },
      art: undefined,
      modifiers: undefined,
      loc: {}
    }
  }

  // 普通属性
  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: value && {
      type: NodeTypes.TEXT,
      content: value.content,
      loc: {}
    },
    loc: {}
  }
}

function parseAttributeValue(context: ParserContext) {
  let content

  const quote = context.source[0]
  advanceBy(context, 1)
  const endIndex = context.source.indexOf(quote)
  if (endIndex === -1) {
    content = parseTextData(context, context.source.length)
  } else {
    content = parseTextData(context, endIndex)
    advanceBy(context, 1)
  }

  return {
    content,
    isQuoted: true,
    loc: {}
  }
}

function advanceSpaces(context: ParserContext): void {
  const match = /^[\t\r\n\f ]+/.exec(context.source)
  if (match) {
    advanceBy(context, match[0].length)
  }
}

function parseText(context: ParserContext) {
  // 普通文本结束的标记
  const endTokens = ['<', '{{']

  // 标记文本内容的长度
  let endIndex = context.source.length

  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i])
    if (index !== -1 && endIndex > index) {
      endIndex = index
    }
  }

  const content = parseTextData(context, endIndex)

  return {
    type: NodeTypes.TEXT,
    content
  }
}

function parseTextData(context: ParserContext, length: number) {
  // 截取出文本的内容
  const rawText = context.source.slice(0, length)

  advanceBy(context, length)

  return rawText
}

function pushNode(nodes, node) {
  nodes.push(node)
}

function startsWithEndTagOpen(source: string, tag: string): boolean {
  return startsWith(source, '</' + tag)
}

function isEnd(context: ParserContext, ancestors): boolean {
  const s = context.source

  if (startsWith(s, '</')) {
    // 这里 for 循环采用倒序的方式是因为，解析过程中存储 node 是栈的形式
    for (let i = ancestors.length - 1; i >= 0; i--) {
      if (startsWithEndTagOpen(s, ancestors[i].tag)) {
        return true
      }
    }
  }

  // 当 source 为空字符串时，也是结束了
  return !s
}

function startsWith(source: string, searchString: string): boolean {
  return source.startsWith(searchString)
}

function advanceBy(context: ParserContext, numberOfCharacters: number) {
  const { source } = context
  context.source = source.slice(numberOfCharacters)
}

// `<div>hello<p>world</p></div>`
/**
 * 第一次 parseChildren, 进入第一次 while 循环，解析到是 div 元素(parseElement)，
 * 然后又 parseChildren 进入第二次 while 循环，先解析 hello 文本, 此时未跳出循环，接着解析到 p 元素(parseElement)，于是
 * 又 parseChildren 进入第三次 while 循环，先解析 world 文本，然后遇到 </p>，于是
 * 跳出第三次 while 循环，此时 parseChildren 返回的是 world 文本，
 * 然后遇到 </div>，跳出第二次 while 循环，，此时 parseChildren 返回的是 p 元素，
 * 然后 source 变成空字符串 ''，跳出第一次 while 循环
 */
