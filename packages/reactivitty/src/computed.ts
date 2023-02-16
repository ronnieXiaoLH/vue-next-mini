import { isFunction } from '@vue/shared'
import { Dep } from './dep'
import { ReactiveEffect } from './effect'
import { trackRefValue, triggerRefValue } from './ref'

export class ComputedRefImpl<T> {
  public dep?: Dep = undefined

  private _value!: T

  public readonly effect: ReactiveEffect<T>

  public readonly __v_isRef = true

  public _dirty = true

  constructor(getter) {
    this.effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true
        console.log('zzzz')
        triggerRefValue(this)
      }
    })
    this.effect.computed = this
  }

  get value() {
    trackRefValue(this)

    // computed 的值是有缓存的
    if (this._dirty) {
      this._dirty = false
      // 执行 this.effect.run 其实是执行 getter
      this._value = this.effect.run()
    }

    return this._value
  }
}

export function computed(getterOrOptions) {
  let getter

  const onlyGetter = isFunction(getterOrOptions)

  if (onlyGetter) {
    getter = getterOrOptions
  }

  const cRef = new ComputedRefImpl(getter)

  return cRef
}
