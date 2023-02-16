function getSequence(arr) {
  // 拷贝原数组
  const p = arr.slice()
  // 初始结果的下标从 0 开始
  const result = [0]
  let i, j, u, v, c
  const len = arr.length

  for (let i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      // result 中最后一个元素（最大值）的下标
      j = result[result.length - 1]
      // 1. for 循环里新的元素的值大于 result 最后一个索引的值，该元素的索引应该插入到 result
      if (arr[j] < arrI) {
        p[i] = j // p 记录 result 更新前，最后一个索引的值
        result.push(i)
        continue
      }
      // 2. for 循环里新的元素的值不大于 result 最后一个索引的值，
      // 利用二分查找，找到 result 中下标对应的元素比 for 循环新的元素小的下标 u
      u = 0
      v = result.length - 1
      while (u < v) {
        c = (u + v) >> 1 // 等价于 c = Math.floor((u + v) / 2)
        if (arr[result[c]] < arrI) {
          u = c + 1
        } else {
          v = c
        }
      }
      // 3. 找到 u 之后，更新 result 中 u 索引的值
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1]
        }
        result[u] = i
      }
    }
  }

  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }

  return result
}

console.log(getSequence([0, 3, 2, 4, 6, 5]))
