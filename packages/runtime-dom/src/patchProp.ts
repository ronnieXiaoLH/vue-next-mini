import { isOn } from '@vue/shared'
import { patchAttr } from './modules/attrs'
import { patchClass } from './modules/class'
import { patchEvent } from './modules/events'
import { patchDOMProp } from './modules/props'
import { patchStyle } from './modules/style'

export function patchProp(
  el: Element,
  key: string,
  oldValue: any,
  nextValue: any
) {
  if (key === 'class') {
    patchClass(el, nextValue)
  } else if (key === 'style') {
    patchStyle(el, key, oldValue, nextValue)
  } else if (isOn(key)) {
    patchEvent(el, key, oldValue, nextValue)
  } else if (shouldSetAsProp(el, key)) {
    // 只应该通过 DOM Property 的方式设置的属性
    patchDOMProp(el, key, nextValue)
  } else {
    // 应该通过 HTML Attribute 的方式设置的属性
    patchAttr(el, key, nextValue)
  }
}

function shouldSetAsProp(el: Element, key: string): boolean {
  // 表单属性是只读的
  if (key === 'form') return false

  if (key === 'list' && el.tagName === 'INPUT') return false

  if (key === 'type' && el.tagName === 'TEXTAREA') return false

  return key in el
}
