// Renders public/icon.svg to the PNG sizes the PWA needs. Run: node scripts/make-icons.mjs
import sharp from 'sharp'
import { readFileSync } from 'node:fs'

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url))
const out = (name) => new URL(`../public/${name}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

await sharp(svg).resize(192, 192).png().toFile(out('icon-192.png'))
await sharp(svg).resize(512, 512).png().toFile(out('icon-512.png'))
await sharp(svg).resize(180, 180).png().toFile(out('apple-touch-icon.png'))
// Maskable: the glyph must sit inside the central 80 % safe zone -> shrink and pad on the brand background.
const inner = await sharp(svg).resize(400, 400).png().toBuffer()
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#060b1a' } })
  .composite([{ input: inner, left: 56, top: 56 }])
  .png()
  .toFile(out('icon-maskable-512.png'))
console.log('icons written')
