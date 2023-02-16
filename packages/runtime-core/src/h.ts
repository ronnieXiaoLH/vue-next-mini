import { isArray, isObject } from '@vue/shared'
import { createVNode, isVNode, VNode } from './vnode'

export function h(type: any, propsOrChidlren?: any, children?: any): VNode {
  const l = arguments.length

  if (l === 2) {
    if (isObject(propsOrChidlren) && !isArray(propsOrChidlren)) {
      if (isVNode(propsOrChidlren)) {
        return createVNode(type, null, [propsOrChidlren])
      }

      return createVNode(type, propsOrChidlren, [])
    } else {
      return createVNode(type, null, propsOrChidlren)
    }
  } else {
    if (l > 3) {
      children = Array.prototype.slice.call(arguments, 2)
    } else if (l === 3 && isVNode(children)) {
      children = [children]
    }
    return createVNode(type, propsOrChidlren, children)
  }
}
