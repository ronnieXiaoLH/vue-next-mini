export function patchEvent(
  el: Element & { _vei?: Object },
  rawName: string,
  prevValue,
  nextValue
) {
  const invokers = el._vei || (el._vei = {})

  const existingInvoker = invokers[rawName]

  // 只改变了同一种事件类型的回调函数，invokers 的形式避免了频繁的 addEventListener 和 removeEventListener
  if (nextValue && existingInvoker) {
    existingInvoker.value = nextValue
  } else {
    const name = parseName(rawName)

    if (nextValue) {
      // 绑定事件
      const invoker = (invokers[rawName] = createInvoker(nextValue))
      el.addEventListener(name, invoker)
    } else if (existingInvoker) {
      // 卸载事件
      el.removeEventListener(name, existingInvoker)
      invokers[rawName] = undefined
    }
  }
}

function createInvoker(initialValue) {
  const invoker = (e: Event) => {
    invoker.value?.()
  }

  invoker.value = initialValue

  return invoker
}

// 将事件 onClik 转化为 click 的形式
function parseName(name: string) {
  return name.slice(2).toLowerCase()
}
