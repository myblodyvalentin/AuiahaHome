import fs from 'node:fs'
import path from 'node:path'
import { publicFlower } from './garden.js'

function unlinkQuiet(filePath) {
  fs.unlink(filePath, () => {})
}

function publicReview(item) {
  return {
    id: item.id,
    type: item.type,
    createdAt: item.createdAt,
    hits: item.hits || [],
    user: item.payload?.user || null,
    body: item.payload?.body || '',
    comment: item.payload?.comment || '',
    col: item.payload?.col,
    row: item.payload?.row,
    images: (item.payload?.images || []).map((img) => ({
      filename: img.filename,
      url: `/api/garden/images/${encodeURIComponent(img.filename)}`,
    })),
  }
}

export function registerModeration(app, { requireAdmin, reviews, messages, garden }) {
  app.get('/api/moderation', requireAdmin, (_req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    const items = reviews.list().map(publicReview)
    res.json({ items, count: items.length })
  })

  app.post('/api/moderation/:id/approve', requireAdmin, async (req, res) => {
    const item = reviews.get(req.params.id)
    if (!item) {
      res.status(404).json({ error: '没有这条待审核内容' })
      return
    }

    if (item.type === 'message') {
      messages.add({
        id: item.id,
        body: String(item.payload?.body || '').trim(),
        createdAt: item.createdAt,
        user: item.payload.user,
      })
      reviews.remove(item.id)
      res.json({ ok: true, type: 'message' })
      return
    }

    if (item.type === 'flower') {
      try {
        const flower = await garden.store.promote(
          {
            id: item.id,
            col: item.payload.col,
            row: item.payload.row,
            comment: item.payload.comment || '',
            images: item.payload.images || [],
            color: item.payload.color,
            createdAt: item.createdAt,
            user: item.payload.user,
          },
          item.id
        )
        reviews.remove(item.id)
        res.json({ ok: true, type: 'flower', flower: publicFlower(flower) })
      } catch (error) {
        if (error?.code === 'OCCUPIED') {
          res.status(409).json({ error: '这块草地已经有花了，无法通过审核' })
          return
        }
        console.error(error)
        res.status(500).json({ error: '审核通过失败，请稍后再试' })
      }
      return
    }

    res.status(400).json({ error: '未知的审核类型' })
  })

  app.post('/api/moderation/:id/reject', requireAdmin, async (req, res) => {
    const item = reviews.get(req.params.id)
    if (!item) {
      res.status(404).json({ error: '没有这条待审核内容' })
      return
    }

    if (item.type === 'flower') {
      await garden.store.release(item.id)
      for (const img of item.payload?.images || []) {
        unlinkQuiet(path.join(garden.uploadDir, img.filename))
      }
    }

    reviews.remove(item.id)
    res.json({ ok: true })
  })
}
