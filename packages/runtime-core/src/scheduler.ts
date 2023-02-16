let isFlushPending = false

const pendingPreFlushCbs: Function[] = []

const resolvedPromise = Promise.resolve() as Promise<any>

let currentFlushPromise: Promise<void> | null = null

export function queuePreFlushCb(cb: Function) {
  queueCb(cb, pendingPreFlushCbs)
}

function queueCb(cb: Function, pendingQueue: Function[]) {
  pendingQueue.push(cb)
  queueFlush()
}

function queueFlush() {
  if (!isFlushPending) {
    isFlushPending = true
    currentFlushPromise = resolvedPromise.then(flushJobs)
  }
}

function flushJobs() {
  isFlushPending = false
  flushPreFlushCbs()
}

export function flushPreFlushCbs() {
  if (pendingPreFlushCbs.length) {
    // 数组去重
    let activePreFlushCbs = [...new Set(pendingPreFlushCbs)]
    // 只需要执行一次，并且清空任务队列
    pendingPreFlushCbs.length = 0
    for (let i = 0; i < activePreFlushCbs.length; i++) {
      activePreFlushCbs[i]()
    }
  }
}
