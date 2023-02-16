import { createVNode } from './vnode'

export function createAppAPI(render) {
  return function createApp(rootComponent, rootProps = null) {
    const app = {
      _component: rootComponent,
      _container: null,
      mount(rootContainer) {
        const vnode = createVNode(rootComponent, rootProps)
        render(vnode, rootContainer)
      }
    }

    return app
  }
}
