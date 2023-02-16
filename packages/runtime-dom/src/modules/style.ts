import { isArray, isString } from '@vue/shared'

export function patchStyle(el: Element, key: string, prev: any, next: any) {
  const style = (el as HTMLElement).style

  const isCssString = isString(style)

  if (next && !isCssString) {
    for (const key in next) {
      setStyle(style, key, next[key])
    }

    // 删除旧的有，而新的没有的值
    if (prev && !isString(prev)) {
      for (const key in prev) {
        if (next[key] == null) {
          setStyle(style, key, '')
        }
      }
    }
  }
}

function setStyle(
  style: CSSStyleDeclaration,
  name: string,
  value: string | string[]
) {
  if (isArray(value)) {
    value.forEach(v => setStyle(style, name, v))
  } else {
    style[name] = value
  }
}
