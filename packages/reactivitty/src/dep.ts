import { ReactiveEffect } from './effect'

export type Dep = Set<ReactiveEffect> | undefined

export function createDep(effects?: ReactiveEffect[]): Dep {
  const dep = new Set<ReactiveEffect>(effects)

  return dep
}
