import { hasChanged } from '@vue/shared'
import { createDep, Dep } from './dep'
import { activeEffect, trackEffects, triggerEffects } from './effect'
import { toReactive } from './reactive'

export interface Ref<T = any> {
  value: T
}

export function ref(value?: unknown) {
  return createRef(value, false)
}

function createRef(rawValue: unknown, shallow: boolean) {
  // 已经是代理过后的 Ref 类型数据，直接返回
  if (isRef(rawValue)) return rawValue

  // 返回一个代理过后的 Ref 类型的数据
  return new RefImpl(rawValue, shallow)
}

class RefImpl<T> {
  private _value: T

  // 原始值
  private _rawValue: T

  public dep: Dep = undefined

  public readonly __v_isRef: boolean = true

  constructor(value: T, public readonly __v_isShallow: boolean) {
    this._rawValue = value
    this._value = __v_isShallow ? value : toReactive(value)
  }

  get value() {
    // 依赖收集
    trackRefValue(this)
    return this._value
  }

  set value(newVal) {
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal
      this._value = toReactive(newVal)
      triggerRefValue(this)
    }
  }
}

/**
 * 收集依赖
 */
export function trackRefValue(ref) {
  if (activeEffect) {
    trackEffects(ref.dep || (ref.dep = createDep()))
  }
}

/**
 * 触发依赖
 */
export function triggerRefValue(ref) {
  if (ref.dep) {
    triggerEffects(ref.dep)
  }
}

function isRef(r: any): r is Ref {
  return !!(r && r.__isRef === true)
}
