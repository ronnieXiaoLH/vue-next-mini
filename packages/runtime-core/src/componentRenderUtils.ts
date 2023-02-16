import { ShapeFlags } from 'packages/shared/src/shapeFlags'
import { createVNode, VNode } from './vnode'

export function renderComponentRoot(instance): VNode {
  const { vnode, render, data = {} } = instance

  let result

  try {
    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      // 这里的 data 已经是处理后的响应式数据，render 函数里面取值的时候，会进行依赖收集
      result = normalizeVNode(render.call(data, data))
    }
  } catch (error) {
    console.error(error)
  }

  return result
}

export function normalizeVNode(child): VNode {
  if (typeof child === 'object') {
    return cloneIfMounted(child)
  } else {
    return createVNode(Text, null, String(child))
  }
}

function cloneIfMounted(child) {
  return child
}
