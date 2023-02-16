import { extend, isObject } from '@vue/shared'
import { track, trigger } from './effect'
import { reactive } from './reactive'

function createGetter(shallow = false) {
  return function get(target: object, key: string | symbol, receiver: object) {
    const res = Reflect.get(target, key, receiver)

    // 依赖收集
    track(target, key)

    if (shallow) {
      return res
    }

    // 懒代理，取值的时候才会去代理深层的对象（Vue2 是直接深度递归代理）
    if (isObject(res)) {
      reactive(res)
    }

    return res
  }
}

const get = createGetter()
const shallowGet = createGetter(true)

function createSetter() {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ) {
    const res = Reflect.set(target, key, value, receiver)

    // 更新视图
    trigger(target, key, value)

    return res
  }
}

const set = createSetter()

export const mutableHandlers: ProxyHandler<object> = {
  get,
  set
}

export const shallowReactiveHandlers = extend({}, mutableHandlers, {
  get: shallowGet
})
