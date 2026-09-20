import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function resolveDataFile() {
  const configured = process.env.REVIEWS_FILE || './data/reviews.json'
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
    fs.writeFileSync(filePath, JSON.stringify({ items: [] }, null, 2), 'utf8')
  }
}

function readStore(filePath) {
  ensureStore(filePath)
  const raw = fs.readFileSync(filePath, 'utf8')
  try {
    const data = JSON.parse(raw)
    if (!Array.isArray(data.items)) data.items = []
    return data
  } catch {
    return { items: [] }
  }
}

function writeStore(filePath, data) {
  ensureStore(filePath)
  const tmp = `${filePath}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  fs.renameSync(tmp, filePath)
}

export function createReviewStore() {
  const filePath = resolveDataFile()
  ensureStore(filePath)

  return {
    filePath,
    list() {
      const data = readStore(filePath)
      return [...data.items].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )
    },
    get(id) {
      const data = readStore(filePath)
      return data.items.find((item) => item.id === id) || null
    },
    add(item) {
      const data = readStore(filePath)
      data.items.push(item)
      writeStore(filePath, data)
      return item
    },
    remove(id) {
      const data = readStore(filePath)
      const index = data.items.findIndex((item) => item.id === id)
      if (index === -1) return null
      const [removed] = data.items.splice(index, 1)
      writeStore(filePath, data)
      return removed
    },
    hasImage(filename) {
      const data = readStore(filePath)
      return data.items.some((item) =>
        (item.payload?.images || []).some((img) => img.filename === filename)
      )
    },
  }
}
