import { extend, isArray } from '@vue/shared'
import { ComputedRefImpl } from './computed'
import { createDep, Dep } from './dep'

type KeyToDepMap = Map<any, Dep>
/**
 * targetMap 是一个 weakMap:
 *  key: 是一个响应式对象
 *  value: 是一个 Map
 *    Map 的 key 是响应式对象的属性
 *    Map 的 value 是一个 Set<ReactiveEffect>
 */
const targetMap = new WeakMap<any, KeyToDepMap>()

export type EffectScheduler = (...args: any[]) => any

export interface ReactiveEffectOptions {
  lazy?: boolean
  scheduler?: EffectScheduler
}

export function effect<T = any>(fn: () => T, options?: ReactiveEffectOptions) {
  let _effect = new ReactiveEffect(fn)
  extend(_effect, options)

  // watch 里面的回调如果没有配置 immediate: true，是不执行的
  if (!options || !options.lazy) {
    _effect.run()
  }
}

// 当前激活的 effect
export let activeEffect: ReactiveEffect | undefined

// ReactiveEffect 的 run 方法存储了 effect 的执行函数，当数据更新的时候，执行 effect 的执行函数来更新视图
export class ReactiveEffect<T = any> {
  public computed?: ComputedRefImpl<T>

  constructor(
    public fn: () => T,
    public scheduler: EffectScheduler | null = null
  ) {}

  run() {
    activeEffect = this
    return this.fn()
  }

  stop() {}
}

/**
 * 依赖收集
 * @param target
 * @param key
 */
export function track(target: object, key: unknown) {
  console.log('track', target, key)
  // 不存在当前激活的 effect 直接返回
  if (!activeEffect) return

  let depsMap = targetMap.get(target)
  // target 不在 targetMap 中
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }

  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = createDep()))
  }

  trackEffects(dep)

  console.log('targetMap', targetMap)
}

/**
 * 利用 dep 以此跟踪指定 key 的所有 effect
 */
export function trackEffects(dep: Dep) {
  dep!.add(activeEffect!)
}

export function trigger(target: object, key: unknown, value: unknown) {
  console.log('trigger', target, key, value)
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  const dep: Dep | undefined = depsMap.get(key)
  if (!dep) return
  triggerEffects(dep)
}

/**
 * 依次触发 dep 中保存的 effect 依赖
 */
export function triggerEffects(dep: Dep) {
  const effects = isArray(dep) ? dep : [...dep!]

  // 防止死循环，先执行 computed 的 ReactiveEffect，在执行 effect 的 ReactiveEffect
  for (const effect of effects) {
    if (effect.computed) {
      triggerEffect(effect)
    }
  }

  for (const effect of effects) {
    if (!effect.computed) {
      triggerEffect(effect)
    }
  }
}

/**
 * 触发 effect 依赖
 */
export function triggerEffect(effect: ReactiveEffect) {
  if (effect.scheduler) {
    effect.scheduler()
  } else {
    effect.run()
  }
}
