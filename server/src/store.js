import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function resolveDataFile() {
  const configured = process.env.DATA_FILE || './data/messages.json'
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
    fs.writeFileSync(filePath, JSON.stringify({ messages: [] }, null, 2), 'utf8')
  }
}

function readStore(filePath) {
  ensureStore(filePath)
  const raw = fs.readFileSync(filePath, 'utf8')
  try {
    const data = JSON.parse(raw)
    if (!Array.isArray(data.messages)) data.messages = []
    return data
  } catch {
    return { messages: [] }
  }
}

function writeStore(filePath, data) {
  ensureStore(filePath)
  const tmp = `${filePath}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  fs.renameSync(tmp, filePath)
}

export function createMessageStore() {
  const filePath = resolveDataFile()
  ensureStore(filePath)

  return {
    filePath,
    list() {
      const data = readStore(filePath)
      return [...data.messages].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )
    },
    add(message) {
      const data = readStore(filePath)
      data.messages.push(message)
      writeStore(filePath, data)
      return message
    },
    remove(id, githubId) {
      const data = readStore(filePath)
      const index = data.messages.findIndex(
        (m) => m.id === id && m.user?.id === githubId
      )
      if (index === -1) return false
      data.messages.splice(index, 1)
      writeStore(filePath, data)
      return true
    },
  }
}
