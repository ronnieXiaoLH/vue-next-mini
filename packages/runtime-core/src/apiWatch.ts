import { EMPTY_OBJECT, hasChanged, isObject } from '@vue/shared'
import { ReactiveEffect } from 'packages/reactivitty/src/effect'
import { isReactive } from 'packages/reactivitty/src/reactive'
import { queuePreFlushCb } from './scheduler'

export interface WatchOpions<immedate = boolean> {
  immediate?: immedate
  deep?: boolean
}

export function watch(source, cb: Function, options?: WatchOpions) {
  return doWatch(source, cb, options)
}

function doWatch(
  source,
  cb: Function,
  { immediate, deep }: WatchOpions = EMPTY_OBJECT
) {
  let getter: () => any

  if (isReactive(source)) {
    getter = () => source
    deep = true
  } else {
    getter = () => {}
  }

  if (cb && deep) {
    const baseGetter = getter
    getter = () => traverse(baseGetter())
  }

  let oldValue = {}

  const job = () => {
    if (cb) {
      const newValue = effect.run()
      if (deep || hasChanged(newValue, oldValue)) {
        cb(newValue, oldValue)
        oldValue = newValue
      }
    }
  }

  let scheduler = () => queuePreFlushCb(job)

  const effect = new ReactiveEffect(getter, scheduler)

  if (cb) {
    if (immediate) {
      job()
    } else {
      oldValue = effect.run()
    }
  } else {
    effect.run()
  }

  return () => {}
}

/**
 * 对 watch 监听的对象的每个属性进行取值，即依赖收集
 * @param value
 * @returns
 */
export function traverse(value: unknown) {
  if (!isObject(value)) {
    return value
  }

  for (const key in value as object) {
    traverse((value as object)[key])
  }

  return value
}
