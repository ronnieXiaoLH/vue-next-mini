import { EMPTY_OBJECT, isString } from '@vue/shared'
import { ReactiveEffect } from 'packages/reactivitty/src/effect'
import { ShapeFlags } from 'packages/shared/src/shapeFlags'
import { createAppAPI } from './apiCreateApp'
import { createComponentInstance, setupComponent } from './component'
import { normalizeVNode, renderComponentRoot } from './componentRenderUtils'
import { queuePreFlushCb } from './scheduler'
import { Fragment, isSameVNodeType, VNode } from './vnode'

export interface RendererOptions {
  createElement(type: string): Element
  setElementText(node: Element, text: string): void
  patchProp(el: Element, key: string, prevValue: any, nextValue: any): void
  insert(el, parent: Element, anchor?): void
  remove(el: Element)
  createText(text: string)
  setText(node: Element, text: string)
  createComment(text: string)
}

export function createRenderer(options: RendererOptions) {
  return baseCreateRenderer(options)
}

function baseCreateRenderer(options: RendererOptions): any {
  const {
    createElement: hostCreateElement,
    setElementText: hostSetElementText,
    patchProp: hostPatchProp,
    insert: hostInsert,
    remove: hostRemove,
    createText: hostCreateText,
    setText: hostSetText,
    createComment: hostCreateComment
  } = options

  const processComponent = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode == null) {
      mountComponent(newVNode, container, anchor)
    }
  }

  const processFragment = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode == null) {
      mountChildren(newVNode.children, container, anchor)
    } else {
      patchChildren(oldVNode, newVNode, container, anchor)
    }
  }

  const processComment = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode == null) {
      newVNode.el = hostCreateComment(newVNode.children)
      hostInsert(newVNode.el, container, anchor)
    } else {
      // 注释不是响应式的数据
      newVNode.el = oldVNode.el
    }
  }

  const processText = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode == null) {
      newVNode.el = hostCreateText(newVNode.children)
      hostInsert(newVNode.el, container, anchor)
    } else {
      const el = (newVNode.el = oldVNode.el!)
      if (newVNode.children !== oldVNode.children) {
        hostSetText(el, newVNode.children)
      }
    }
  }

  const processElement = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode == null) {
      // 挂载
      mountElement(newVNode, container, anchor)
    } else {
      // 更新
      patchElement(oldVNode, newVNode)
    }
  }

  const mountComponent = (initialVNode, container, anchor) => {
    const instance = (initialVNode.component =
      createComponentInstance(initialVNode))

    // 给组件的 instance 初始化 render (vnode 的 type 中的 render，或者是 setup 中返回的 render)
    setupComponent(instance)

    // 组件的挂载
    setupRenderEffect(instance, initialVNode, container, anchor)
  }

  const setupRenderEffect = (instance, initialVNode, container, anchor) => {
    const componentUpdateFn = () => {
      if (!instance.isMounted) {
        const { bm, m } = instance

        // 在组件挂载之前执行 beforeMount 生命周期
        if (bm) {
          bm()
        }

        const subTree = (instance.subTree = renderComponentRoot(instance))

        patch(null, subTree, container, anchor)

        // 组件挂载完成后，执行 mounted 生命周期
        if (m) {
          m()
        }

        initialVNode.el = subTree.el

        instance.isMounted = true
      } else {
        let { next, vnode } = instance

        if (!next) {
          next = vnode
        }

        // 组件数据更新时，再次根据组件的 render 函数生成新的 vnode，这个时候组件的数据已经改变，所以页面更新
        const nextTree = renderComponentRoot(instance)
        const prevTree = instance.subTree
        instance.subTree = nextTree

        patch(prevTree, nextTree, container, anchor)

        next.el = nextTree.el
      }
    }

    const effect = (instance.effect = new ReactiveEffect(
      componentUpdateFn,
      () => queuePreFlushCb(update)
    ))

    const update = (instance.update = () => effect.run())

    update()
  }

  const mountElement = (vnode: VNode, container, anchor) => {
    const { type, props, shapeFlag, children } = vnode
    // 1. 创建 element
    const el = (vnode.el = hostCreateElement(type))
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 2. 设置文本
      hostSetElementText(el, children)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode.children, el, anchor)
    }
    // 3. 设置 props
    if (props) {
      if (props) {
        for (const key in props) {
          hostPatchProp(el, key, null, props[key])
        }
      }
    }
    // 4. 插入
    hostInsert(el, container, anchor)
  }

  const patchElement = (oldVNode, newVNode) => {
    const el = (newVNode.el = oldVNode.el)

    const oldProps = oldVNode.props || EMPTY_OBJECT
    const newProps = newVNode.props || EMPTY_OBJECT

    patchChildren(oldVNode, newVNode, el, null)

    patchProps(el, newVNode, oldProps, newProps)
  }

  const patchProps = (
    el: Element,
    vnode,
    oldProps: object,
    newProps: object
  ) => {
    if (oldProps !== newProps) {
      // 更新新的 props 每个属性的值
      for (const key in newProps) {
        const next = newProps[key]
        const prev = oldProps[key]
        if (next !== prev) {
          hostPatchProp(el, key, prev, next)
        }
      }
      // 删除旧的 props 有的属性，而新的 props 没有的属性
      if (oldProps !== EMPTY_OBJECT) {
        for (const key in oldProps) {
          if (!(key in newProps)) {
            hostPatchProp(el, key, oldProps[key], null)
          }
        }
      }
    }
  }

  const mountChildren = (children, container, anchor) => {
    if (isString(children)) {
      children = children.split('')
    }

    for (let i = 0; i < children.length; i++) {
      const child = (children[i] = normalizeVNode(children[i]))
      patch(null, child, container, anchor)
    }
  }

  const patchChildren = (oldVNode, newVNode, container, anchor) => {
    const c1 = oldVNode?.children
    const prevShapeFlag = oldVNode?.shapeFlag || 0
    const c2 = newVNode.children
    const shapeFlag = newVNode.shapeFlag

    /**
     * 1. 新的有子节点，旧的没有子节点
     * 2. 新的没有子节点，旧的有子节点
     * 3.
     */
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 新的子节点是文本节点，旧的子节点是数组
        // 删除旧的数组子节点
      }

      // 新旧子节点的文本内容不同
      // 更新子节点文本内容
      if (c2 !== c1) {
        hostSetElementText(container, c2)
      }
    } else {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 新旧子节点都是数组
          // diff
          patchKeyedChildren(c1, c2, container, anchor)
        } else {
        }
      } else {
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          // 新的子节点不是文本，旧的子节点是文本
          // 删除旧的子节点的文本
          hostSetElementText(container, '')
        }
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 新的子节点是数组，旧的子节点不是数组
          // 挂载新的数组子节点
        }
      }
    }
  }

  const patchKeyedChildren = (
    oldChildren,
    newChildren,
    container,
    parentAnchor
  ) => {
    let i = 0
    const newChildrenLength = newChildren.length
    let oldChildrenEnd = oldChildren.length - 1
    let newChildrenEnd = newChildrenLength - 1

    // 1. 头头比对-自前向后比对，遇到不是相同节点，跳出循环
    while (i <= oldChildrenEnd && i <= newChildrenEnd) {
      const oldVNode = oldChildren[i]
      const newVNode = normalizeVNode(newChildren[i])

      if (isSameVNodeType(oldVNode, newVNode)) {
        patch(oldVNode, newVNode, container, null)
      } else {
        break
      }
      i++
    }

    // 2. 尾尾比对-自后向前比对，遇到不是相同节点，跳出循环
    while (i <= oldChildrenEnd && i <= newChildrenEnd) {
      const oldVNode = oldChildren[oldChildrenEnd]
      const newVNode = newChildren[newChildrenEnd]

      if (isSameVNodeType(oldVNode, newVNode)) {
        patch(oldVNode, newVNode, container, null)
      } else {
        break
      }
      oldChildrenEnd--
      newChildrenEnd--
    }

    // 3. 新的子节点的长度大于旧的子节点的长度，一定有新的子节点需要插入
    if (i > oldChildrenEnd) {
      if (i <= newChildrenEnd) {
        const newVNode = normalizeVNode(newChildren[i])

        const nextPos = newChildrenEnd + 1
        const anchor =
          nextPos < newChildrenLength ? newChildren[nextPos].el : parentAnchor
        while (i <= newChildrenEnd) {
          patch(null, newVNode, container, anchor)
          i++
        }
      }
    } else if (i > newChildrenEnd) {
      // 4. 新的子节点长度小于旧的子节点的长度，一定有旧的子节点需要被卸载
      while (i <= oldChildrenEnd) {
        unmount(oldChildren[i])
        i++
      }
    } else {
      // 5. 乱序比对
      const oldStartIndex = i
      const newStartIndex = i

      // 5.1 以新的子节点的 key 为 key, index 为 value 建立一个映射表
      const keyToNewIndexMap = new Map()
      for (let i = newStartIndex; i < newChildrenEnd; i++) {
        const newVNode = normalizeVNode(newChildren[i])
        keyToNewIndexMap.set(newVNode.key, i)
      }

      // 5.2 遍历旧的子节点，在映射表中能被复用的节点
      // 记录已打补丁的新的子节点的数量
      let patched = 0
      // 新的子节点需要打补丁的数量
      const toBePatched = newChildrenEnd - newStartIndex + 1
      // 标记是否需要移动节点
      let moved = false
      let maxNewIndexSoFar = 0
      // 用来记录映射表中哪些节点被复用了，初始值为 0 ，不为 0 表示已经被复用了，此时值是旧的子节点的索引值 + 1
      const newIndexToOldIndexMap = new Array(toBePatched).fill(0)
      // 遍历旧的子节点，根据映射表找可以被复用的节点
      for (let i = oldStartIndex; i <= oldChildrenEnd; i++) {
        const oldVNode = oldChildren[i]
        // 已打补丁的新的子节点的数量大于需要打补丁的子节点的数量，直接卸载旧的子节点
        if (patched >= toBePatched) {
          unmount(oldVNode)
          continue
        }
        const newIndex = keyToNewIndexMap.get(oldVNode.key)
        if (newIndex === undefined) {
          // 该旧的子节点，没有在映射表中找到，表示该节点不能复用，直接卸载
          unmount(oldVNode)
        } else {
          // 记录新的子节点可以被复用时，它对应的复用的旧的子节点的索引（这里是 + 1 的，避免出现 0 的情况）
          newIndexToOldIndexMap[newIndex - newStartIndex] = i + 1
          // if 里面的逻辑只是用来标记是否需要移动节点，简化版本可以删除这部分的逻辑
          // 每次找到的新的节点的索引的值都是大于当前最大索引值时，表示刚好就是一个递增子序列；只要一次不是，则表示不是递增子序列，需要移动节点
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex
          } else {
            moved = true
          }
          // 这里根据新的子节点的 vnode 更新了对应的旧的子节点的 DOM
          // 但是位置还不一定是对的
          patch(oldVNode, newChildren[newIndex], container)
          // 已打补丁的节点 + 1
          patched++
        }
      }

      // 5.3
      const increasingNewIndexSequence = moved
        ? getSequence(newIndexToOldIndexMap)
        : []
      //
      let j = increasingNewIndexSequence.length - 1
      for (let i = toBePatched - 1; i >= 0; i--) {
        const newIndex = i + newStartIndex
        const newVNode = newChildren[newIndex]
        const anchor =
          newIndex + 1 < newChildrenLength ? newChildren[newIndex + 1].el : null
        if (newIndexToOldIndexMap[i] === 0) {
          // 映射表中没有被复用的节点，新增
          patch(null, newVNode, container, anchor)
        } else if (moved) {
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            // 不在最长递增子序列中的节点需要插入
            move(newVNode, container, anchor)
          } else {
            j--
          }
        }
      }
    }
  }

  const move = (vnode, container, anchor) => {
    const { el } = vnode
    hostInsert(el, container, anchor)
  }

  const patch = (oldVNode, newVNode, container, anchor = null) => {
    if (oldVNode === newVNode) return

    if (oldVNode && !isSameVNodeType(oldVNode, newVNode)) {
      unmount(oldVNode)
      oldVNode = null
    }

    const { type, shapeFlag } = newVNode

    switch (type) {
      case Text:
        processText(oldVNode, newVNode, container, anchor)
        break
      case Comment:
        processComment(oldVNode, newVNode, container, anchor)
        break
      case Fragment:
        processFragment(oldVNode, newVNode, container, anchor)
        break

      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 元素
          processElement(oldVNode, newVNode, container, anchor)
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          // 组件
          processComponent(oldVNode, newVNode, container, anchor)
        }
    }
  }

  const unmount = (vnode: VNode) => {
    hostRemove(vnode.el!)
  }

  const render = (vnode, container) => {
    if (vnode === null) {
      // 卸载
      if (container._vnode) {
        unmount(container._vnode)
      }
    } else {
      patch(container._vnode, vnode, container)
    }

    container._vnode = vnode
  }

  return {
    render,
    createApp: createAppAPI(render)
  }
}

// 获取最长递增子序列的下标
function getSequence(arr) {
  // 拷贝原数组
  const p = arr.slice()
  // 初始结果的下标从 0 开始
  const result = [0]
  let i, j, u, v, c
  const len = arr.length

  for (let i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      // result 中最后一个元素（最大值）的下标
      j = result[result.length - 1]
      // 1. for 循环里新的元素的值大于 result 最后一个索引的值，该元素的索引应该插入到 result
      if (arr[j] < arrI) {
        p[i] = j // p 记录 result 更新前，最后一个索引的值
        result.push(i)
        continue
      }
      // 2. for 循环里新的元素的值不大于 result 最后一个索引的值，
      // 利用二分查找，找到 result 中下标对应的元素比 for 循环新的元素小的下标 u
      u = 0
      v = result.length - 1
      while (u < v) {
        c = (u + v) >> 1 // 等价于 c = Math.floor((u + v) / 2)
        if (arr[result[c]] < arrI) {
          u = c + 1
        } else {
          v = c
        }
      }
      // 3. 找到 u 之后，更新 result 中 u 索引的值
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1]
        }
        result[u] = i
      }
    }
  }

  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }

  return result
}
