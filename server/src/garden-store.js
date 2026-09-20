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
    return data
  } catch {
    return { flowers: [] }
  }
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
    find(id) {
      const data = readStore(filePath)
      return data.flowers.find((flower) => flower.id === id) || null
    },
    isOccupied(col, row) {
      const data = readStore(filePath)
      return data.flowers.some((flower) => flower.col === col && flower.row === row)
    },
    plant(flower) {
      return locked(() => {
        const data = readStore(filePath)
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
  }
}
