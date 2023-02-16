import { createRenderer } from '@vue/runtime-core'
import { extend, isString } from '@vue/shared'
import { nodeOps } from './nodeOps'
import { patchProp } from './patchProp'

const rendererOptions = extend({ patchProp }, nodeOps)

let renderer

function ensureRenderer() {
  return renderer || (renderer = createRenderer(rendererOptions))
}

export const render = (...args) => {
  ensureRenderer().render(...args)
}

export const createApp = (...args) => {
  const app = ensureRenderer().createApp(...args)
  const { mount } = app

  // 改写 mount 方法
  app.mount = (containerOrSelect: Element | string) => {
    const container = normalizeContainer(containerOrSelect)

    if (!container) return

    mount(container)
  }

  return app
}

function normalizeContainer(container: Element | string): Element | null {
  if (isString(container)) {
    return document.querySelector(container)
  }
  return container
}
