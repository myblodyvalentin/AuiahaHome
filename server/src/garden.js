import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { nanoid } from 'nanoid'
import multer from 'multer'
import { createGardenStore, GARDEN_GRID } from './garden-store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const MAX_IMAGES = 3
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_COMMENT = 500
const ALLOWED_MIME = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
])

const PALETTE = ['#ff8fab', '#ffc15a', '#7ed0f7', '#c9a7ff', '#8ee08a', '#ffb4a2']

function resolveUploadDir() {
  const configured = process.env.UPLOAD_DIR || './data/uploads/garden'
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(__dirname, '..', configured)
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function asInt(value) {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value !== 'string' || !/^-?\d+$/.test(value.trim())) return NaN
  return Number.parseInt(value, 10)
}

function sniffImageExt(filePath) {
  const fd = fs.openSync(filePath, 'r')
  const buf = Buffer.alloc(12)
  fs.readSync(fd, buf, 0, 12, 0)
  fs.closeSync(fd)

  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return 'png'
  }
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'gif'
  if (
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp'
  }
  return null
}

function unlinkQuiet(filePath) {
  fs.unlink(filePath, () => {})
}

function publicFlower(flower) {
  return {
    id: flower.id,
    col: flower.col,
    row: flower.row,
    comment: flower.comment,
    color: flower.color,
    createdAt: flower.createdAt,
    user: flower.user,
    images: (flower.images || []).map((img) => ({
      url: `/api/garden/images/${encodeURIComponent(img.filename)}`,
    })),
  }
}

function multerMessage(err) {
  if (!err) return '图片上传失败'
  if (err.code === 'LIMIT_FILE_SIZE') return '每张图片最多 5MB'
  if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
    return '最多上传 3 张图片'
  }
  return err.message || '图片上传失败'
}

export function registerGarden(app, { session }) {
  const store = createGardenStore()
  const uploadDir = resolveUploadDir()
  ensureDir(uploadDir)

  const upload = multer({
    storage: multer.diskStorage({
      destination(_req, _file, cb) {
        ensureDir(uploadDir)
        cb(null, uploadDir)
      },
      filename(_req, file, cb) {
        const ext = ALLOWED_MIME.get(file.mimetype) || 'jpg'
        cb(null, `${nanoid(18)}.${ext}`)
      },
    }),
    limits: {
      files: MAX_IMAGES,
      fileSize: MAX_IMAGE_BYTES,
      fieldSize: 8 * 1024,
    },
    fileFilter(_req, file, cb) {
      if (ALLOWED_MIME.has(file.mimetype)) {
        cb(null, true)
        return
      }
      cb(new Error('仅支持 JPG / PNG / WEBP / GIF 图片'))
    },
  })

  app.get('/api/garden', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.json({
      grid: GARDEN_GRID,
      flowers: store.list().map(publicFlower),
    })
  })

  app.get('/api/garden/images/:filename', (req, res) => {
    const filename = path.basename(String(req.params.filename || ''))
    if (!/^[A-Za-z0-9_-]+\.(jpe?g|png|webp|gif)$/i.test(filename)) {
      res.status(400).json({ error: '无效的图片' })
      return
    }

    const filePath = path.join(uploadDir, filename)
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: '图片不存在' })
      return
    }

    res.setHeader('Cache-Control', 'public, max-age=604800, immutable')
    res.sendFile(filePath)
  })

  app.post('/api/garden/flowers', session.requireUser, (req, res) => {
    upload.array('images', MAX_IMAGES)(req, res, async (err) => {
      const files = req.files || []
      const cleanup = () => files.forEach((file) => unlinkQuiet(file.path))

      if (err) {
        cleanup()
        res.status(400).json({ error: multerMessage(err) })
        return
      }

      try {
        const col = asInt(req.body?.col)
        const row = asInt(req.body?.row)
        const comment = String(req.body?.comment || '').trim()

        if (
          !Number.isInteger(col) ||
          !Number.isInteger(row) ||
          col < 0 ||
          row < 0 ||
          col >= GARDEN_GRID.cols ||
          row >= GARDEN_GRID.rows
        ) {
          cleanup()
          res.status(400).json({ error: '请选择有效的草地坐标' })
          return
        }

        if (comment.length > MAX_COMMENT) {
          cleanup()
          res.status(400).json({ error: '评论最多 500 字' })
          return
        }

        if (!comment && files.length === 0) {
          cleanup()
          res.status(400).json({ error: '请写一点文字，或上传至少一张图片' })
          return
        }

        const images = []
        for (const file of files) {
          const sniffed = sniffImageExt(file.path)
          if (!sniffed) {
            cleanup()
            res.status(400).json({ error: '有文件不是有效图片' })
            return
          }
          images.push({
            filename: file.filename,
            mime: file.mimetype,
            size: file.size,
          })
        }

        const flower = await store.plant({
          id: nanoid(12),
          col,
          row,
          comment,
          images,
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          createdAt: new Date().toISOString(),
          user: {
            id: req.user.id,
            login: req.user.login,
            name: req.user.name,
            avatarUrl: req.user.avatarUrl,
          },
        })

        res.status(201).json({ flower: publicFlower(flower) })
      } catch (error) {
        cleanup()
        if (error?.code === 'OCCUPIED') {
          res.status(409).json({ error: error.message, occupied: true })
          return
        }
        console.error(error)
        res.status(500).json({ error: '种花失败，请稍后再试' })
      }
    })
  })

  return { store, uploadDir }
}
