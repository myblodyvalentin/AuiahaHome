import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const GARDEN_GRID = Object.freeze({
  cols: 18,
  rows: 7,
})

function resolveDataFile() {
  const configured = process.env.FLOWERS_FILE || './data/flowers.json'
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(__dirname, '..', configured)
}

function ensureStore(filePath) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({ flowers: [] }, null, 2), 'utf8')
  }
}

function readStore(filePath) {
  ensureStore(filePath)
  const raw = fs.readFileSync(filePath, 'utf8')
  try {
    const data = JSON.parse(raw)
    if (!Array.isArray(data.flowers)) data.flowers = []
    if (!Array.isArray(data.reserved)) data.reserved = []
    return data
  } catch {
    return { flowers: [], reserved: [] }
  }
}

function isBlocked(data, col, row) {
  return (
    data.flowers.some((flower) => flower.col === col && flower.row === row) ||
    data.reserved.some((slot) => slot.col === col && slot.row === row)
  )
}

function writeStore(filePath, data) {
  ensureStore(filePath)
  const tmp = `${filePath}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  fs.renameSync(tmp, filePath)
}

export function createGardenStore() {
  const filePath = resolveDataFile()
  ensureStore(filePath)

  let chain = Promise.resolve()
  function locked(fn) {
    const run = chain.then(fn, fn)
    chain = run.then(
      () => undefined,
      () => undefined
    )
    return run
  }

  return {
    filePath,
    grid: GARDEN_GRID,
    list() {
      const data = readStore(filePath)
      return [...data.flowers].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      )
    },
    listReserved() {
      const data = readStore(filePath)
      return [...data.reserved]
    },
    find(id) {
      const data = readStore(filePath)
      return data.flowers.find((flower) => flower.id === id) || null
    },
    hasImage(filename) {
      const data = readStore(filePath)
      return data.flowers.some((flower) =>
        (flower.images || []).some((img) => img.filename === filename)
      )
    },
    isOccupied(col, row) {
      const data = readStore(filePath)
      return isBlocked(data, col, row)
    },
    plant(flower) {
      return locked(() => {
        const data = readStore(filePath)
        if (isBlocked(data, flower.col, flower.row)) {
          const error = new Error('这块草地已经有花了')
          error.code = 'OCCUPIED'
          throw error
        }
        data.flowers.push(flower)
        writeStore(filePath, data)
        return flower
      })
    },
    reserve({ col, row, pendingId }) {
      return locked(() => {
        const data = readStore(filePath)
        if (isBlocked(data, col, row)) {
          const error = new Error('这块草地已经有花了')
          error.code = 'OCCUPIED'
          throw error
        }
        data.reserved.push({ col, row, pendingId })
        writeStore(filePath, data)
        return { col, row, pendingId }
      })
    },
    release(pendingId) {
      return locked(() => {
        const data = readStore(filePath)
        data.reserved = data.reserved.filter((slot) => slot.pendingId !== pendingId)
        writeStore(filePath, data)
      })
    },
    promote(flower, pendingId) {
      return locked(() => {
        const data = readStore(filePath)
        data.reserved = data.reserved.filter((slot) => slot.pendingId !== pendingId)
        const taken = data.flowers.some(
          (item) => item.col === flower.col && item.row === flower.row
        )
        if (taken) {
          const error = new Error('这块草地已经有花了')
          error.code = 'OCCUPIED'
          throw error
        }
        data.flowers.push(flower)
        writeStore(filePath, data)
        return flower
      })
    },
    remove(id) {
      return locked(() => {
        const data = readStore(filePath)
        const index = data.flowers.findIndex((flower) => flower.id === id)
        if (index === -1) return null
        const [flower] = data.flowers.splice(index, 1)
        writeStore(filePath, data)
        return flower
      })
    },
  }
}
