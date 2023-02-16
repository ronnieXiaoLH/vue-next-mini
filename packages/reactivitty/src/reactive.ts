import { isObject } from '@vue/shared'
import { mutableHandlers } from './baseHandlers'

export const reactiveMap = new WeakMap<object, any>()

export const enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive'
}

export function reactive(target) {
  return createReactiveObject(target, mutableHandlers, reactiveMap)
}

function createReactiveObject(
  target: object,
  baseHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<object, any>
) {
  // target 不是对象，直接返回
  if (!isObject) return target

  const existingProxy = proxyMap.get(target)
  // 已经被代理过，直接返回代理
  if (existingProxy) return existingProxy

  // 创建一个 target 的 proxy 代理对象
  const proxy = new Proxy(target, baseHandlers)

  // 新增一个标记是 reactive 的属性
  proxy[ReactiveFlags.IS_REACTIVE] = true

  // 代理对象写入 proxyMap 中
  proxyMap.set(target, proxy)

  // 返回代理对象
  return proxy
}

export function toReactive<T extends unknown>(value: T): T {
  return isObject(value) ? reactive(value) : value
}

export function isReactive(value): boolean {
  return !!(value && value[ReactiveFlags.IS_REACTIVE])
}
