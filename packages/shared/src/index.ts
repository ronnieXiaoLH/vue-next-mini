export { toDisplayString } from './toDisplayString'

export const isObject = value => typeof value === 'object' && value !== null
export const isArray = Array.isArray
export const extend = Object.assign
export const hasChanged = (value: any, oldValue: any) =>
  !Object.is(value, oldValue)
export const isFunction = (value: unknown): value is Function =>
  typeof value === 'function'
export const isString = (value: unknown): value is string =>
  typeof value === 'string'

export const EMPTY_OBJECT: { readonly [key: string]: any } = {}

const onReg = /^on[^a-z]/
export const isOn = (key: string) => onReg.test(key)
