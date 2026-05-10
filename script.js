// ── STATE ────────────────────────────────
const state = {
  stream:       null,
  shots:        [],        // foto sementara selama capture berlangsung
  sessions:     [],        // array semua sesi yang sudah selesai
  shotCount:    1,
  timerVal:     0,
  mirrored:     false,
  filter:       'none',
  filterName:   'Normal',
  counting:     false,
  layout:       'strip',
  templateName: 'Single',
}

// ── ELEMEN ───────────────────────────────
const video         = document.getElementById('video')
const countdown     = document.getElementById('countdown')
const flash         = document.getElementById('flash')
const startOverlay  = document.getElementById('start-overlay')
const errorOverlay  = document.getElementById('error-overlay')
const errorText     = document.getElementById('error-text')
const statusDot     = document.getElementById('status-dot')
const statusText    = document.getElementById('status-text')
const filterLabel   = document.getElementById('filter-label')
const tbCaptureBtn  = document.getElementById('tb-capture-btn')
const btnCap        = document.getElementById('btn-cap')
const capLbl        = document.getElementById('cap-lbl')
const btnMirror     = document.getElementById('btn-mirror')
const progressFill  = document.getElementById('progress-fill')
const progressLabel = document.getElementById('progress-label')

// ── 1. CAMERA ────────────────────────────
async function startCamera() {
  errorOverlay.style.display = 'none'
  startOverlay.style.display = 'none'

  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false
    })

    video.srcObject = state.stream
    video.style.display = 'block'

    video.addEventListener('loadedmetadata', () => {
      statusDot.classList.add('live')
      statusText.textContent = 'Ready'
      btnCap.disabled = false
      tbCaptureBtn.disabled = false
    }, { once: true })

  } catch (err) {
    showError(err)
  }
}

function showError(err) {
  startOverlay.style.display = 'none'
  errorOverlay.style.display = 'flex'
  const msgs = {
    NotAllowedError:      'Izin kamera ditolak. Klik ikon kunci di address bar.',
    NotFoundError:        'Kamera tidak ditemukan.',
    NotReadableError:     'Kamera sedang dipakai aplikasi lain.',
    OverconstrainedError: 'Kamera tidak mendukung resolusi ini.',
  }
  errorText.textContent = msgs[err.name] || 'Error: ' + err.message
  statusDot.classList.remove('live')
  statusText.textContent = 'Error'
}

// ── 2. FILTER ────────────────────────────
function setFilter(el, f) {
  document.querySelectorAll('.sb-row').forEach(r => r.classList.remove('active'))
  el.classList.add('active')
  state.filter     = f
  state.filterName = el.querySelector('.sb-name').textContent
  video.style.filter = f === 'none' ? '' : f
  filterLabel.textContent = state.filterName
}

function drawWithFilter(ctx, videoEl, filterStr, w, h) {
  if (!filterStr || filterStr === 'none') {
    ctx.drawImage(videoEl, 0, 0, w, h)
    return
  }
  if (filterStr === 'grayscale(1)') {
    ctx.drawImage(videoEl, 0, 0, w, h)
    const imageData = ctx.getImageData(0, 0, w, h)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114
      data[i] = data[i+1] = data[i+2] = gray
    }
    ctx.putImageData(imageData, 0, 0)
    return
  }
  ctx.save()
  ctx.filter = filterStr
  ctx.drawImage(videoEl, 0, 0, w, h)
  ctx.restore()
}

// ── 3. TEMPLATE ──────────────────────────
function setTemplate(el, count, layout) {
  document.querySelectorAll('.ins-tpl-row').forEach(r => r.classList.remove('active'))
  el.classList.add('active')
  state.shotCount    = count
  state.layout       = layout || 'strip'
  state.templateName = el.querySelector('.ins-tpl-name').textContent
  state.shots        = []
  resetCaptureBtn()
  buildShotList()
}

// ── 4. TIMER ─────────────────────────────
function setTimer(el, val) {
  document.querySelectorAll('.t-opt').forEach(o => o.classList.remove('active'))
  el.classList.add('active')
  state.timerVal = val
}

// ── 5. MIRROR ────────────────────────────
function toggleMirror() {
  state.mirrored = !state.mirrored
  video.style.transform = state.mirrored ? 'scaleX(-1)' : ''
  btnMirror.classList.toggle('on', state.mirrored)
}

// ── 6. CAPTURE ───────────────────────────
function doCapture() {
  if (state.counting || !state.stream) return

  // sudah penuh → reset untuk set baru
  // sudah penuh → hapus sesi terakhir dari gallery lalu reset untuk set baru
  if (state.shots.length >= state.shotCount) {
    // kalau mau retake, hapus sesi terakhir yang sudah tersimpan
    // supaya tidak duplikat di gallery
    state.sessions.pop()
    state.shots = []
    buildShotList()
    resetCaptureBtn()
    return
  }

  state.timerVal > 0 ? startCountdown() : takePhoto()
}

function startCountdown() {
  state.counting = true
  btnCap.classList.add('capturing')
  tbCaptureBtn.classList.add('red')
  tbCaptureBtn.textContent = '⏹ Stop'
  capLbl.textContent = 'Stop'

  let t = state.timerVal
  countdown.textContent = t
  countdown.classList.add('show')

  const iv = setInterval(() => {
    t--
    if (t <= 0) {
      clearInterval(iv)
      countdown.classList.remove('show')
      resetCaptureBtn()
      takePhoto()
    } else {
      countdown.className = 'vp-countdown'
      void countdown.offsetWidth
      countdown.textContent = t
      countdown.className = 'vp-countdown show'
    }
  }, 1000)
}

function takePhoto() {
  flash.classList.add('flash')
  setTimeout(() => flash.classList.remove('flash'), 120)

  const W = video.videoWidth
  const H = video.videoHeight

  const final    = document.createElement('canvas')
  final.width    = W
  final.height   = H
  const finalCtx = final.getContext('2d')

  if (state.mirrored) {
    finalCtx.translate(W, 0)
    finalCtx.scale(-1, 1)
    finalCtx.drawImage(video, 0, 0, W, H)
    finalCtx.setTransform(1, 0, 0, 1, 0, 0)

    if (state.filter === 'grayscale(1)') {
      const imageData = finalCtx.getImageData(0, 0, W, H)
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114
        data[i] = data[i+1] = data[i+2] = gray
      }
      finalCtx.putImageData(imageData, 0, 0)
    } else if (state.filter !== 'none') {
      const tmp    = document.createElement('canvas')
      tmp.width    = W
      tmp.height   = H
      const tmpCtx = tmp.getContext('2d')
      tmpCtx.translate(W, 0)
      tmpCtx.scale(-1, 1)
      tmpCtx.drawImage(video, 0, 0, W, H)
      finalCtx.save()
      finalCtx.filter = state.filter
      finalCtx.drawImage(tmp, 0, 0)
      finalCtx.restore()
    }
  } else {
    drawWithFilter(finalCtx, video, state.filter, W, H)
  }

  const dataURL = final.toDataURL('image/png')
  state.shots.push(dataURL)
  buildShotList()

  // semua slot terisi → simpan sebagai sesi baru
  // semua slot terisi → simpan sebagai sesi baru, langsung reset
  // semua slot terisi → simpan sebagai sesi baru
  if (state.shots.length >= state.shotCount) {
    saveSession()
    capLbl.textContent = 'New set'
    tbCaptureBtn.textContent = '+ New set'
  }
}

// ── 7. SESSION ───────────────────────────
function saveSession() {
  const now  = new Date()
  const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  state.sessions.push({
    id:           state.sessions.length + 1,
    templateName: state.templateName,
    layout:       state.layout,
    shotCount:    state.shotCount,
    time:         time,
    shots:        [...state.shots],  // copy array
  })
}

// ── 8. RESET BTN ─────────────────────────
function resetCaptureBtn() {
  state.counting = false
  btnCap.classList.remove('capturing')
  tbCaptureBtn.classList.remove('red')
  tbCaptureBtn.textContent = '⏺ Capture'
  capLbl.textContent = 'Capture'
}

// ── 9. RETAKE ────────────────────────────
function retake() {
  if (state.shots.length === 0) return
  state.shots.pop()
  buildShotList()
  if (state.shots.length < state.shotCount) {
    resetCaptureBtn()
  }
}

// ── 10. SHOT LIST (inspector) ────────────
function buildShotList() {
  const list = document.getElementById('shot-list')
  list.innerHTML = ''

  for (let i = 0; i < state.shotCount; i++) {
    const taken = i < state.shots.length

    const row = document.createElement('div')
    row.className = 'ins-shot-row'

    const thumb = document.createElement('div')
    thumb.className = 'ins-shot-thumb' + (taken ? ' done' : '')

    if (taken) {
      const img = new Image()
      img.src   = state.shots[i]
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:3px'
      thumb.appendChild(img)
    } else {
      thumb.textContent = i + 1
    }

    const info = document.createElement('div')
    info.className = 'ins-shot-info'

    const nm = document.createElement('div')
    nm.className   = 'ins-shot-name'
    nm.textContent = taken ? 'Shot ' + (i + 1) : 'Waiting...'

    const sb = document.createElement('div')
    sb.className   = 'ins-shot-sub'
    sb.textContent = taken
      ? 'Tap to preview'
      : 'Slot ' + (i + 1) + ' of ' + state.shotCount

    info.appendChild(nm)
    info.appendChild(sb)

    const dots = document.createElement('span')
    dots.className   = 'ins-shot-dots'
    dots.textContent = '···'

    row.appendChild(thumb)
    row.appendChild(info)
    row.appendChild(dots)
    list.appendChild(row)
  }

  const pct = state.shotCount > 0
    ? Math.round(state.shots.length / state.shotCount * 100)
    : 0
  progressFill.style.width  = pct + '%'
  progressLabel.textContent = state.shots.length + ' of ' + state.shotCount
}

// ── 11. DOWNLOAD ─────────────────────────
function downloadResult() {
  if (state.sessions.length === 0 && state.shots.length === 0) return
  const shots = state.shots.length > 0
    ? state.shots
    : state.sessions[state.sessions.length - 1]?.shots
  if (!shots || shots.length === 0) return

  if (shots.length === 1) {
    downloadDataURL(shots[0], 'booth-photo.png')
    return
  }
  state.layout === 'grid' ? buildGridCanvas(shots) : buildStripCanvas(shots)
}

function downloadSession(session) {
  if (session.shots.length === 1) {
    downloadDataURL(session.shots[0], `booth-session${session.id}.png`)
    return
  }
  const name = `booth-session${session.id}`
  session.layout === 'grid' ? buildGridCanvas(session.shots, name) : buildStripCanvas(session.shots, name)
}

function downloadAllSessions() {
  if (state.sessions.length === 0) return
  state.sessions.forEach((session, i) => {
    setTimeout(() => downloadSession(session), i * 600)
  })
}

function buildStripCanvas(shots, filename) {
  const PAD   = 20
  const W     = 800
  const slotH = Math.round(W * (9 / 16))

  const canvas  = document.createElement('canvas')
  canvas.width  = W
  canvas.height = PAD + shots.length * (slotH + PAD)

  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  loadAllImages(shots, (imgs) => {
    imgs.forEach((img, i) => {
      drawCover(ctx, img, PAD, PAD + i * (slotH + PAD), W - PAD * 2, slotH)
    })
    downloadCanvas(canvas, filename || `booth-strip-${new Date().toISOString().slice(0, 10)}`)
  })
}

function buildGridCanvas(shots, filename) {
  const PAD   = 20
  const W     = 800
  const cellW = Math.floor((W - PAD * 3) / 2)
  const cellH = Math.round(cellW * (3 / 4))

  const canvas  = document.createElement('canvas')
  canvas.width  = W
  canvas.height = PAD * 3 + cellH * 2

  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  loadAllImages(shots, (imgs) => {
    imgs.forEach((img, i) => {
      if (i >= 4) return
      const col = i % 2
      const row = Math.floor(i / 2)
      drawCover(ctx, img, PAD + col * (cellW + PAD), PAD + row * (cellH + PAD), cellW, cellH)
    })
    downloadCanvas(canvas, filename || `booth-grid-${new Date().toISOString().slice(0, 10)}`)
  })
}

function drawCover(ctx, img, x, y, w, h) {
  const imgRatio = img.width / img.height
  const boxRatio = w / h
  let sx, sy, sw, sh
  if (imgRatio > boxRatio) {
    sh = img.height; sw = img.height * boxRatio
    sx = (img.width - sw) / 2; sy = 0
  } else {
    sw = img.width; sh = img.width / boxRatio
    sx = 0; sy = (img.height - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

function loadAllImages(dataURLs, callback) {
  const imgs = new Array(dataURLs.length)
  let loaded = 0
  dataURLs.forEach((src, i) => {
    const img  = new Image()
    img.onload = () => { imgs[i] = img; loaded++; if (loaded === dataURLs.length) callback(imgs) }
    img.src    = src
  })
}

function downloadCanvas(canvas, filename) {
  canvas.toBlob(blob => {
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = filename + '.png'
    document.body.appendChild(link); link.click()
    document.body.removeChild(link); URL.revokeObjectURL(url)
  }, 'image/png')
}

function downloadDataURL(dataURL, filename) {
  const link = document.createElement('a')
  link.href = dataURL; link.download = filename
  document.body.appendChild(link); link.click()
  document.body.removeChild(link)
}

// ── 12. SHARE ────────────────────────────
async function shareResult() {
  if (state.shots.length === 0 || !navigator.share) return
  try {
    const res  = await fetch(state.shots[0])
    const blob = await res.blob()
    const file = new File([blob], 'booth-photo.png', { type: 'image/png' })
    await navigator.share({ files: [file], title: 'Photo Booth Result' })
  } catch (err) {
    console.log('Share cancelled or not supported')
  }
}

// ── 13. RATIO ────────────────────────────
function setRatio(el) {
  document.querySelectorAll('.tb-group:last-of-type .tb-seg')
    .forEach(s => s.classList.remove('active'))
  el.classList.add('active')
}

// ── 14. TAB SWITCH ───────────────────────
function switchTab(tab) {
  const sidebar    = document.querySelector('.sidebar')
  const vpPanel    = document.querySelector('.vp-panel')
  const inspector  = document.querySelector('.inspector')
  const galleryPanel = document.getElementById('gallery-panel')
  const tabCamera  = document.getElementById('tab-camera')
  const tabGallery = document.getElementById('tab-gallery')
  const tbCapBtn   = document.getElementById('tb-capture-btn')

  if (tab === 'gallery') {
    if (sidebar)   sidebar.style.display   = 'none'
    if (vpPanel)   vpPanel.style.display   = 'none'
    if (inspector) inspector.style.display = 'none'
    galleryPanel.style.display = 'flex'
    tabCamera.classList.remove('active')
    tabGallery.classList.add('active')
    tbCapBtn.style.display = 'none'
    buildGallery()
  } else {
    if (sidebar)   sidebar.style.display   = ''
    if (vpPanel)   vpPanel.style.display   = ''
    if (inspector) inspector.style.display = ''
    galleryPanel.style.display = 'none'
    tabCamera.classList.add('active')
    tabGallery.classList.remove('active')
    tbCapBtn.style.display = ''
  }
}

// ── 15. GALLERY ──────────────────────────
function buildGallery() {
  const container = document.getElementById('gallery-grid')
  const empty     = document.getElementById('gallery-empty')
  const countEl   = document.getElementById('gallery-count')
  const btnDlAll  = document.getElementById('btn-dl-all')

  container.innerHTML = ''

  // gabungkan sesi selesai + sesi yang sedang berjalan
  const allSessions = [...state.sessions]

  if (allSessions.length === 0) {
    container.style.display = 'none'
    empty.classList.add('show')
    countEl.textContent = '0 sessions'
    btnDlAll.disabled   = true
    return
  }

  container.style.display = 'block'
  empty.classList.remove('show')
  btnDlAll.disabled = false

  const totalPhotos = allSessions.reduce((sum, s) => sum + s.shots.length, 0)
  countEl.textContent =
    allSessions.length + ' session' + (allSessions.length > 1 ? 's' : '') +
    ' · ' + totalPhotos + ' photo' + (totalPhotos > 1 ? 's' : '')

  allSessions.forEach((session) => {
    // wrapper grup
    const group = document.createElement('div')
    group.className = 'gallery-group'

    // header
    const header = document.createElement('div')
    header.className = 'gallery-group-header'

    const left = document.createElement('div')
    left.className = 'gallery-group-left'

    const title = document.createElement('span')
    title.className   = 'gallery-group-title'
    title.textContent = 'Session ' + session.id +
      (session.inProgress ? '  🔴 In progress' : '')

    const meta = document.createElement('span')
    meta.className   = 'gallery-group-meta'
    meta.textContent = session.templateName + ' · ' + session.time

    left.appendChild(title)
    left.appendChild(meta)

    const right = document.createElement('div')
    right.className = 'gallery-group-actions'

    if (!session.inProgress) {
      const btnDl = document.createElement('button')
      btnDl.className   = 'gallery-group-btn'
      btnDl.textContent = '↓ Download set'
      btnDl.onclick     = () => downloadSession(session)
      right.appendChild(btnDl)
    }

    header.appendChild(left)
    header.appendChild(right)

    // foto grid
    const grid = document.createElement('div')
    grid.className = 'gallery-session-grid'

    session.shots.forEach((dataURL, i) => {
      const card = document.createElement('div')
      card.className = 'gallery-card'

      const img = document.createElement('img')
      img.className = 'gallery-card-img'
      img.src       = dataURL
      img.alt       = 'Shot ' + (i + 1)
      img.onclick   = () => openLightbox(allSessions.indexOf(session), i, allSessions)

      const footer = document.createElement('div')
      footer.className = 'gallery-card-footer'

      const label = document.createElement('span')
      label.className   = 'gallery-card-label'
      label.textContent = 'Shot ' + (i + 1)

      const actions = document.createElement('div')
      actions.className = 'gallery-card-actions'

      const btnDl = document.createElement('button')
      btnDl.className   = 'gallery-card-btn'
      btnDl.title       = 'Download'
      btnDl.textContent = '↓'
      btnDl.onclick     = () => downloadDataURL(dataURL, `booth-s${session.id}-shot${i + 1}.png`)

      const btnDel = document.createElement('button')
      btnDel.className   = 'gallery-card-btn delete'
      btnDel.title       = 'Hapus'
      btnDel.textContent = '✕'
      btnDel.onclick     = () => deletePhoto(session, i)

      actions.appendChild(btnDl)
      actions.appendChild(btnDel)
      footer.appendChild(label)
      footer.appendChild(actions)
      card.appendChild(img)
      card.appendChild(footer)
      grid.appendChild(card)
    })

    group.appendChild(header)
    group.appendChild(grid)
    container.appendChild(group)
  })
}

function deletePhoto(session, photoIndex) {
  if (session.inProgress) {
    state.shots.splice(photoIndex, 1)
    buildShotList()
    if (state.shots.length < state.shotCount) resetCaptureBtn()
  } else {
    const si = state.sessions.findIndex(s => s.id === session.id)
    if (si !== -1) {
      state.sessions[si].shots.splice(photoIndex, 1)
      if (state.sessions[si].shots.length === 0) state.sessions.splice(si, 1)
    }
  }
  buildGallery()
}

// ── 16. LIGHTBOX ─────────────────────────
let lbSessionIdx = 0
let lbPhotoIdx   = 0
let lbSessions   = []

function openLightbox(sIdx, pIdx, sessions) {
  lbSessions   = sessions
  lbSessionIdx = sIdx
  lbPhotoIdx   = pIdx
  updateLightbox()
  document.getElementById('gallery-lightbox').classList.add('open')
}

function closeLightbox() {
  document.getElementById('gallery-lightbox').classList.remove('open')
}

function lightboxPrev() {
  lbPhotoIdx--
  if (lbPhotoIdx < 0) {
    lbSessionIdx = (lbSessionIdx - 1 + lbSessions.length) % lbSessions.length
    lbPhotoIdx   = lbSessions[lbSessionIdx].shots.length - 1
  }
  updateLightbox()
}

function lightboxNext() {
  lbPhotoIdx++
  if (lbPhotoIdx >= lbSessions[lbSessionIdx].shots.length) {
    lbSessionIdx = (lbSessionIdx + 1) % lbSessions.length
    lbPhotoIdx   = 0
  }
  updateLightbox()
}

function updateLightbox() {
  const session   = lbSessions[lbSessionIdx]
  const flatIndex = lbSessions.slice(0, lbSessionIdx).reduce((s, x) => s + x.shots.length, 0) + lbPhotoIdx + 1
  const total     = lbSessions.reduce((s, x) => s + x.shots.length, 0)

  document.getElementById('lightbox-img').src = session.shots[lbPhotoIdx]
  document.getElementById('lightbox-counter').textContent =
    'Session ' + session.id + ' · Shot ' + (lbPhotoIdx + 1) + ' / ' + session.shots.length +
    '  (' + flatIndex + ' of ' + total + ')'
}

// ── INIT ─────────────────────────────────
buildShotList()
btnCap.disabled = true