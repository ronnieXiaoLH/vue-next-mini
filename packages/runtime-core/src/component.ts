import { reactive } from '@vue/reactivitty'
import { isFunction, isObject } from '@vue/shared'
import { onBeforeMount, onMounted } from './apiLifecycle'

let uid = 0

let compile: any = null

export const enum LifecycleHooks {
  BEFORE_CREATE = 'bc',
  CREATED = 'c',
  BEFORE_MOUNT = 'bm',
  MOUNTED = 'm'
}

export function createComponentInstance(vnode) {
  const { type } = vnode

  const instance = {
    uid: uid++,
    vnode,
    type,
    subTree: null,
    effect: null,
    update: null,
    render: null,
    isMounted: false,
    bc: null,
    c: null,
    bm: null,
    m: null
  }

  return instance
}

export function setupComponent(instance) {
  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
  const Component = instance.type

  const { setup } = Component

  if (setup) {
    // composition API 的处理
    const setupResult = setup()
    handleSetupResult(instance, setupResult)
  } else {
    // options API 的处理
    finishComponentSetup(instance)
  }
}

export function handleSetupResult(instance, setupResult) {
  if (isFunction(setupResult)) {
    instance.render = setupResult
  }
  finishComponentSetup(instance)
}

export function finishComponentSetup(instance) {
  const Component = instance.type

  if (!instance.render) {
    if (compile && !Component.render) {
      const template = Component.template
      Component.render = compile(template)
    }
    instance.render = Component.render
  }

  // 处理 Vue2 options API 的 options
  applyOptions(instance)
}

export function registerRuntimeCompiler(_compile: any) {
  compile = _compile
}

function applyOptions(instance) {
  const {
    data: dataOptions,
    beforeCreate,
    created,
    beforeMount,
    mounted
  } = instance.type

  // 在组件数据初始化之前，执行 beforeCreate 生命周期
  if (beforeCreate) {
    callHook(beforeCreate)
  }

  // 处理 data，将 data 转换为响应式的数据，并保存在 instance
  if (dataOptions) {
    const data = dataOptions()
    if (isObject(data)) {
      instance.data = reactive(data)
    }
  }

  // 在组件数据初始化完成之后，执行 created 生命周期
  if (created) {
    callHook(created, instance.data)
  }

  function registerLifecycleHook(register: Function, hook?: Function) {
    register(hook?.bind(instance.data), instance)
  }

  // 利用函数柯里化的思想，将生命周期的 hooks 注册到 instance
  registerLifecycleHook(onBeforeMount, beforeMount)
  registerLifecycleHook(onMounted, mounted)
}

function callHook(hook: Function, proxy?) {
  hook.bind(proxy)()
}
