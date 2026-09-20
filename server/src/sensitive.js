import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SENSITIVE_WORDS } from './sensitive-words.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function resolveExtraFile() {
  const configured = process.env.SENSITIVE_WORDS_FILE || './data/sensitive-words.txt'
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(__dirname, '..', configured)
}

function fold(text) {
  return String(text || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\u00a0\u200b-\u200d\ufeff]/g, '')
    .replace(/[^\p{L}\p{N}\u4e00-\u9fff]/gu, '')
}

function isAsciiWord(word) {
  return /^[a-z0-9]+$/i.test(word)
}

function readExtraWords(filePath) {
  try {
    if (!fs.existsSync(filePath)) return []
    return fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.replace(/#.*$/, '').trim())
      .filter((line) => line.length >= 2)
  } catch {
    return []
  }
}

function uniqueWords(list) {
  const seen = new Set()
  const words = []
  for (const raw of list) {
    const word = String(raw || '').trim()
    if (word.length < 2) continue
    const key = fold(word) || word.toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    words.push(word)
  }
  return words.sort((a, b) => fold(b).length - fold(a).length)
}

export function createScanner() {
  const extraFile = resolveExtraFile()

  function allWords() {
    return uniqueWords([...SENSITIVE_WORDS, ...readExtraWords(extraFile)])
  }

  function scan(...parts) {
    const raw = parts.filter((part) => part != null).join('\n')
    if (!raw.trim()) return []

    const folded = fold(raw)
    const lower = raw.toLowerCase()
    const hits = []

    for (const word of allWords()) {
      const foldedWord = fold(word)
      if (!foldedWord) continue

      let matched = false
      if (isAsciiWord(foldedWord)) {
        const escaped = foldedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const bounded = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i')
        matched =
          bounded.test(lower) ||
          bounded.test(folded) ||
          (foldedWord.length >= 5 && folded.includes(foldedWord))
      } else {
        matched = folded.includes(foldedWord)
      }

      if (matched) hits.push(word)
    }

    return hits
  }

  return {
    scan,
    extraFile,
    wordCount: () => allWords().length,
  }
}
