// Card di condivisione (FR-018/019, contracts/share-card.md). Disegnata su <canvas>,
// sempre nella palette "cantina" (scuro), indipendentemente dal tema dell'app.
import { getRatingLevel } from './rating.js'
import { notesExcerpt, starsFor, shareText, cardFileName, BACCO_SITE } from './shareText.js'
import { downloadBlob } from './download.js'
import { formatAbv, kindLabel } from './format.js'

const WIDTH = 1080
const HEIGHT = 1920
const MARGIN = 80

const PALETTE = {
  botte: '#1C1613',
  gesso: '#EDE6D8',
  cenere: '#B5A99A',
  feccia: '#C9607F',
  luppolo: '#E0AC4A',
  rame: '#C08050',
}

async function loadFonts() {
  await Promise.all([
    document.fonts.load('700 72px "Big Shoulders Stencil Display"'),
    document.fonts.load('400 36px "Atkinson Hyperlegible Next"'),
    document.fonts.load('700 36px "Atkinson Hyperlegible Next"'),
  ])
}

// Stesse sagome di BottleIcon.vue (viewBox 24×48), usate in grande come filigrana.
const BOTTLE_PATHS = {
  wine: 'M10.5 5H13.5V14C13.5 16 19 16.5 19 21V44A2 2 0 0 1 17 46H7A2 2 0 0 1 5 44V21C5 16.5 10.5 16 10.5 14Z',
  beer: 'M10 5.5H14V16C14 19 18 20 18 25V44A2 2 0 0 1 16 46H8A2 2 0 0 1 6 44V25C6 20 10 19 10 16Z',
}

function drawWatermark(ctx, type, color) {
  // Grande sagoma della bottiglia in filigrana, quando non c'è una foto.
  const scale = 26
  ctx.save()
  ctx.globalAlpha = 0.18
  ctx.translate(WIDTH / 2 - 12 * scale, 120)
  ctx.scale(scale, scale)
  ctx.fillStyle = color
  ctx.fill(new Path2D(BOTTLE_PATHS[type === 'beer' ? 'beer' : 'wine']))
  ctx.restore()
}

async function drawBackground(ctx, bottle, coverBlob) {
  if (coverBlob) {
    const bitmap = await createImageBitmap(coverBlob)
    const scale = Math.max(WIDTH / bitmap.width, HEIGHT / bitmap.height)
    const w = bitmap.width * scale
    const h = bitmap.height * scale
    ctx.drawImage(bitmap, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h)
    bitmap.close?.()

    const gradient = ctx.createLinearGradient(0, HEIGHT * 0.45, 0, HEIGHT)
    gradient.addColorStop(0, 'rgba(28,22,19,0)')
    gradient.addColorStop(1, 'rgba(28,22,19,0.95)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
  } else {
    ctx.fillStyle = PALETTE.botte
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    drawWatermark(ctx, bottle.type, bottle.type === 'wine' ? PALETTE.feccia : PALETTE.luppolo)
  }
}

/** Riduce la dimensione del testo finché non entra in maxLines righe larghe maxWidth. */
function fitLines(ctx, text, { maxWidth, maxLines, maxSize, minSize, font }) {
  for (let size = maxSize; size >= minSize; size -= 4) {
    ctx.font = font(size)
    const words = text.split(' ')
    const lines = []
    let current = ''
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (ctx.measureText(candidate).width > maxWidth && current) {
        lines.push(current)
        current = word
      } else {
        current = candidate
      }
    }
    if (current) lines.push(current)
    if (lines.length <= maxLines) return { size, lines }
  }
  ctx.font = font(minSize)
  return { size: minSize, lines: [text] }
}

/**
 * @param {object} bottle
 * @param {Blob|null} coverBlob
 * @returns {Promise<Blob>}
 */
export async function renderShareCard(bottle, coverBlob) {
  await loadFonts()

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')

  await drawBackground(ctx, bottle, coverBlob)

  const contentWidth = WIDTH - MARGIN * 2

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = PALETTE.gesso

  // Piè di pagina promozionale (FR-018): marchio Bacco + sito del progetto.
  const footerBaseline = HEIGHT - MARGIN
  ctx.fillStyle = PALETTE.rame
  ctx.fillRect(MARGIN, footerBaseline - 84, contentWidth, 3)
  ctx.textAlign = 'left'
  ctx.font = '700 56px "Big Shoulders Stencil Display"'
  ctx.fillStyle = PALETTE.gesso
  ctx.fillText('BACCO', MARGIN, footerBaseline)
  ctx.textAlign = 'right'
  ctx.font = '400 32px "Atkinson Hyperlegible Next"'
  ctx.fillStyle = PALETTE.cenere
  ctx.fillText(BACCO_SITE, WIDTH - MARGIN, footerBaseline)

  ctx.textAlign = 'left'
  // cursorY è sempre la baseline della prossima riga da disegnare, salendo dal
  // basso verso l'alto: ogni blocco la legge, disegna, e la sposta in su di
  // quanto gli serve, senza che i blocchi successivi debbano "indovinare" quanto
  // spazio ha occupato quello precedente.
  let cursorY = HEIGHT - MARGIN - 140

  // Estratto note (dal basso verso l'alto)
  const excerpt = notesExcerpt(bottle.notes ?? '', 140)
  if (excerpt) {
    ctx.font = '400 36px "Atkinson Hyperlegible Next"'
    const { lines } = fitLines(ctx, `"${excerpt}"`, {
      maxWidth: contentWidth,
      maxLines: 3,
      maxSize: 36,
      minSize: 28,
      font: (s) => `400 ${s}px "Atkinson Hyperlegible Next"`,
    })
    for (let i = lines.length - 1; i >= 0; i--) {
      ctx.fillStyle = PALETTE.gesso
      ctx.fillText(lines[i], MARGIN, cursorY)
      cursorY -= 46
    }
    cursorY -= 20
  }

  // Etichetta del livello
  const level = getRatingLevel(bottle.rating)
  ctx.font = '400 36px "Atkinson Hyperlegible Next"'
  ctx.fillStyle = PALETTE.cenere
  ctx.fillText(level?.label ?? '', MARGIN, cursorY)
  cursorY -= 70

  // Stelle + numero
  ctx.font = '700 56px "Atkinson Hyperlegible Next"'
  ctx.fillStyle = PALETTE.gesso
  ctx.fillText(`${starsFor(bottle.rating)}  ${bottle.rating}/5`, MARGIN, cursorY)
  cursorY -= 80

  // Produttore · annata
  const subtitle = [bottle.producer, bottle.vintage, formatAbv(bottle.abv)].filter(Boolean).join(' · ')
  if (subtitle) {
    ctx.font = '400 44px "Atkinson Hyperlegible Next"'
    ctx.fillStyle = PALETTE.cenere
    ctx.fillText(subtitle, MARGIN, cursorY)
    cursorY -= 70
  }

  // Nome, in stencil, con riduzione automatica su max 3 righe. Si disegna
  // dall'ultima riga alla prima, risalendo, così "HO BEVUTO" può essere
  // posizionato in base alla baseline reale della prima riga (non a una stima).
  const { size, lines: nameLines } = fitLines(ctx, bottle.name.toUpperCase(), {
    maxWidth: contentWidth,
    maxLines: 3,
    maxSize: 120,
    minSize: 72,
    font: (s) => `700 ${s}px "Big Shoulders Stencil Display"`,
  })
  ctx.font = `700 ${size}px "Big Shoulders Stencil Display"`
  ctx.fillStyle = PALETTE.gesso
  const lineHeight = size * 1.05
  for (let i = nameLines.length - 1; i >= 0; i--) {
    ctx.fillText(nameLines[i], MARGIN, cursorY)
    cursorY -= lineHeight
  }
  const firstLineBaseline = cursorY + lineHeight

  // "HO BEVUTO": la sua baseline sta abbastanza sopra quella della prima riga
  // del nome da non sovrapporsi mai alle sue maiuscole (altezza ≈ "size").
  ctx.font = '700 48px "Big Shoulders Stencil Display"'
  ctx.fillStyle = PALETTE.cenere
  const kind = kindLabel(bottle, ' ').toUpperCase()
  ctx.fillText(`HO BEVUTO · ${kind}`, MARGIN, firstLineBaseline - size - 24)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Impossibile generare la card.'))), 'image/png')
  })
}

/**
 * @param {Blob} blob
 * @param {object} bottle
 */
export async function shareOrDownload(blob, bottle) {
  const file = new File([blob], cardFileName(bottle.name), { type: 'image/png' })
  const text = shareText(bottle)
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text })
    } catch (err) {
      if (err?.name !== 'AbortError') throw err
    }
  } else {
    downloadBlob(blob, file.name)
  }
}
