import http from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'

const publicRootCandidates = [
  resolve(process.cwd(), 'dist', 'public'),
  resolve(process.cwd(), 'public'),
]
const publicRoot = publicRootCandidates.find((candidate) => existsSync(candidate)) || publicRootCandidates[0]
const port = Number(process.env.PORT || 3000)

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function resolvePublicFile(pathname) {
  let decodedPath
  try {
    decodedPath = decodeURIComponent(pathname)
  } catch {
    return null
  }

  const relativePath = normalize(decodedPath).replace(/^([/\\])+/, '')
  const requestedPath = resolve(publicRoot, relativePath)
  if (requestedPath !== publicRoot && !requestedPath.startsWith(`${publicRoot}${sep}`)) return null

  const candidates = [requestedPath]
  if (!extname(requestedPath)) {
    candidates.push(join(requestedPath, 'index.html'))
    candidates.push(`${requestedPath}.html`)
  }

  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) || null
}

http.createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://localhost')
  const filePath = resolvePublicFile(url.pathname)

  if (!filePath) {
    const notFoundPath = join(publicRoot, '404.html')
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
    createReadStream(notFoundPath).pipe(response)
    return
  }

  const extension = extname(filePath).toLowerCase()
  const isImmutableAsset = url.pathname.startsWith('/_next/static/')
  response.writeHead(200, {
    'Content-Type': contentTypes[extension] || 'application/octet-stream',
    'Cache-Control': isImmutableAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  })
  createReadStream(filePath).pipe(response)
}).listen(port, '0.0.0.0')
