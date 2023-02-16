import { isArray, isFunction, isObject, isString } from '@vue/shared'
import { normalizeClass } from 'packages/shared/src/normalizeProp'
import { ShapeFlags } from 'packages/shared/src/shapeFlags'

export const Fragment = Symbol('Fragment')
export const Text = Symbol('Text')
export const Comment = Symbol('Comment')

export interface VNode {
  __v_isVNode: true
  type: any
  props: any
  children: any
  shapeFlag: number
  el: Element | null
  key: any
}

export function createVNode(type: any, props?: any, children?: any): VNode {
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : isObject(type)
    ? ShapeFlags.STATEFUL_COMPONENT
    : 0

  // 对 props 中的 class 和 style 做增强处理
  if (props) {
    let { class: klass } = props
    if (klass && !isString(klass)) {
      props.class = normalizeClass(klass)
    }
  }

  return createBaseVNode(type, props, children, shapeFlag)
}

export { createVNode as createElementVNode }

function createBaseVNode(
  type: any,
  props: any,
  children: any,
  shapeFlag: number
): VNode {
  const vnode = {
    __v_isVNode: true,
    type,
    props,
    shapeFlag,
    el: null,
    key: props?.key || null
  } as VNode

  normalizeChildren(vnode, children)

  return vnode
}

/**
 * 对 children 进行处理，最终得到一个 shapeFlag 的值，可以标记出 vnode 的 type 和 children 的 type
 * @param vnode
 * @param children
 */
export function normalizeChildren(vnode: VNode, children: unknown) {
  let type = 0

  if (children == null) {
    children = null
  } else if (isArray(children)) {
    type = ShapeFlags.ARRAY_CHILDREN
  } else if (isObject(children)) {
  } else if (isFunction(children)) {
  } else {
    children = String(children)
    type = ShapeFlags.TEXT_CHILDREN
  }

  vnode.children = children
  vnode.shapeFlag |= type
}

export function isVNode(value: any) {
  return value ? value.__v_isVNode === true : false
}

export function isSameVNodeType(n1: VNode, n2: VNode) {
  return n1.type === n2.type && n1.key === n2.key
}
