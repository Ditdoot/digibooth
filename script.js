// ── STATE ────────────────────────────────
const state = {
  stream:    null,
  shots:     [],      // array dataURL foto yang sudah diambil
  shotCount: 1,       // target jumlah foto
  timerVal:  0,
  mirrored:  false,
  filter:    'none',  // CSS filter string aktif
  counting:  false,
  layout:    'strip', // 'strip' atau 'grid'
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
  state.filter = f
  // live preview di video pakai CSS filter
  video.style.filter = f === 'none' ? '' : f
  filterLabel.textContent = el.querySelector('.sb-name').textContent
}

// FIX FILTER: ctx.filter tidak reliable di Safari.
// Solusi: render video ke offscreen canvas dulu,
// lalu pakai CSS filter via drawImage dari canvas yang sudah di-filter.
// Cara paling kompatibel: buat <canvas> sementara, set style.filter,
// lalu getContext dari img yang di-render lewat CSS.
//
// Cara paling simpel yang work di semua browser:
// set ctx.filter SEBELUM drawImage, ini support Chrome + Firefox + Safari 15.4+
// Ganti fungsi drawWithFilter yang lama dengan ini
function drawWithFilter(ctx, videoEl, filterStr, w, h) {
  if (!filterStr || filterStr === 'none') {
    ctx.drawImage(videoEl, 0, 0, w, h)
    return
  }

  // Cara yang work di SEMUA browser termasuk Safari:
  // 1. render video ke canvas sementara tanpa filter
  // 2. convert canvas ke blob URL
  // 3. buat Image element, set CSS filter lewat inline style
  // 4. draw Image itu ke canvas utama

  // Tapi cara di atas async dan complex.
  // Cara paling simpel yang cross-browser:
  // Gunakan globalCompositeOperation + filter via SVG feColorMatrix

  // Untuk sekarang, pakai ctx.filter dulu
  // (Chrome + Firefox + Safari 15.4+)
  // dan tambahkan fallback manual untuk B&W
  
  if (filterStr === 'grayscale(1)') {
    // fallback manual untuk B&W — work di semua browser
    ctx.drawImage(videoEl, 0, 0, w, h)
    const imageData = ctx.getImageData(0, 0, w, h)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      // rumus luminance — lebih akurat dari rata-rata biasa
      const gray = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114
      data[i]   = gray  // R
      data[i+1] = gray  // G
      data[i+2] = gray  // B
      // data[i+3] = alpha, tidak diubah
    }
    ctx.putImageData(imageData, 0, 0)
    return
  }

  // untuk filter lain — pakai ctx.filter
  ctx.save()
  ctx.filter = filterStr
  ctx.drawImage(videoEl, 0, 0, w, h)
  ctx.restore()
}

// ── 3. TEMPLATE ──────────────────────────
function setTemplate(el, count, layout) {
  document.querySelectorAll('.ins-tpl-row').forEach(r => r.classList.remove('active'))
  el.classList.add('active')
  state.shotCount = count
  state.layout    = layout || 'strip'
  state.shots     = []
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

  // sudah penuh → retake all
  if (state.shots.length >= state.shotCount) {
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

  // handle mirror
  if (state.mirrored) {
    finalCtx.translate(W, 0)
    finalCtx.scale(-1, 1)
    // kalau mirror, draw dulu lalu apply filter di atas
    finalCtx.drawImage(video, 0, 0, W, H)
    finalCtx.setTransform(1, 0, 0, 1, 0, 0) // reset transform

    // apply filter manual ke hasil draw
    if (state.filter === 'grayscale(1)') {
      const imageData = finalCtx.getImageData(0, 0, W, H)
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114
        data[i] = data[i+1] = data[i+2] = gray
      }
      finalCtx.putImageData(imageData, 0, 0)
    } else if (state.filter !== 'none') {
      // untuk filter lain saat mirror — perlu redraw dengan filter
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
    // tidak mirror — langsung draw dengan filter
    drawWithFilter(finalCtx, video, state.filter, W, H)
  }

  const dataURL = final.toDataURL('image/png')
  state.shots.push(dataURL)
  buildShotList()

  if (state.shots.length >= state.shotCount) {
    capLbl.textContent = 'Retake all'
    tbCaptureBtn.textContent = '↺ Retake'
  }
}

// ── 7. RESET CAPTURE BTN ─────────────────
function resetCaptureBtn() {
  state.counting = false
  btnCap.classList.remove('capturing')
  tbCaptureBtn.classList.remove('red')
  tbCaptureBtn.textContent = '⏺ Capture'
  capLbl.textContent = 'Capture'
}

// ── 8. RETAKE ────────────────────────────
// Retake hanya hapus foto TERAKHIR
function retake() {
  if (state.shots.length === 0) return
  state.shots.pop()
  buildShotList()
  if (state.shots.length < state.shotCount) {
    resetCaptureBtn()
  }
}

// ── 9. SHOT LIST ─────────────────────────
function buildShotList() {
  const list = document.getElementById('shot-list')
  list.innerHTML = ''

  for (let i = 0; i < state.shotCount; i++) {
    const taken = i < state.shots.length

    const row   = document.createElement('div')
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
    nm.className = 'ins-shot-name'
    nm.textContent = taken ? 'Shot ' + (i + 1) : 'Waiting...'

    const sb = document.createElement('div')
    sb.className = 'ins-shot-sub'
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

// ── 10. DOWNLOAD ─────────────────────────
function downloadResult() {
  if (state.shots.length === 0) return

  if (state.shots.length === 1) {
    downloadDataURL(state.shots[0], 'booth-photo.png')
    return
  }

  state.layout === 'grid' ? buildGridCanvas() : buildStripCanvas()
}

// Strip: foto disusun vertikal
function buildStripCanvas() {
  const PAD    = 20
  const W      = 800
  const slotH  = Math.round(W * (9 / 16))

  const canvas  = document.createElement('canvas')
  canvas.width  = W
  canvas.height = PAD + state.shots.length * (slotH + PAD)

  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  loadAllImages(state.shots, (imgs) => {
    imgs.forEach((img, i) => {
      const y = PAD + i * (slotH + PAD)
      drawCover(ctx, img, PAD, y, W - PAD * 2, slotH)
    })
    const ts = new Date().toISOString().slice(0, 10)
    downloadCanvas(canvas, `booth-strip-${ts}`)
  })
}

// FIX GRID: posisi [x, y] dihitung dengan benar per kolom dan baris
function buildGridCanvas() {
  const PAD    = 20
  const W      = 800
  // lebar tiap cell = separuh lebar canvas dikurangi 3x padding (kiri, tengah, kanan)
  const cellW  = Math.floor((W - PAD * 3) / 2)
  const cellH  = Math.round(cellW * (3 / 4))   // rasio 4:3

  const canvas  = document.createElement('canvas')
  canvas.width  = W
  // tinggi total = 2 baris cell + 3 padding (atas, tengah, bawah)
  canvas.height = PAD * 3 + cellH * 2

  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  loadAllImages(state.shots, (imgs) => {
    imgs.forEach((img, i) => {
      if (i >= 4) return

      // FIX: hitung col dan row dengan benar
      const col = i % 2          // 0 atau 1  (kiri / kanan)
      const row = Math.floor(i / 2)  // 0 atau 1  (atas / bawah)

      const x = PAD + col * (cellW + PAD)
      const y = PAD + row * (cellH + PAD)

      drawCover(ctx, img, x, y, cellW, cellH)
    })
    const ts = new Date().toISOString().slice(0, 10)
    downloadCanvas(canvas, `booth-grid-${ts}`)
  })
}

// drawCover: gambar img ke area (x,y,w,h) dengan object-fit:cover
// supaya foto tidak squeeze meski rasio berbeda
function drawCover(ctx, img, x, y, w, h) {
  const imgRatio  = img.width / img.height
  const boxRatio  = w / h

  let sx, sy, sw, sh

  if (imgRatio > boxRatio) {
    // gambar lebih lebar dari box → crop kiri-kanan
    sh = img.height
    sw = img.height * boxRatio
    sx = (img.width - sw) / 2
    sy = 0
  } else {
    // gambar lebih tinggi dari box → crop atas-bawah
    sw = img.width
    sh = img.width / boxRatio
    sx = 0
    sy = (img.height - sh) / 2
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

// helper: load semua dataURL → array Image objects → callback
function loadAllImages(dataURLs, callback) {
  const imgs  = new Array(dataURLs.length)
  let loaded  = 0

  dataURLs.forEach((src, i) => {
    const img  = new Image()
    img.onload = () => {
      imgs[i] = img
      loaded++
      if (loaded === dataURLs.length) callback(imgs)
    }
    img.src = src
  })
}

function downloadCanvas(canvas, filename) {
  canvas.toBlob(blob => {
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href     = url
    link.download = filename + '.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, 'image/png')
}

function downloadDataURL(dataURL, filename) {
  const link = document.createElement('a')
  link.href     = dataURL
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// ── 11. SHARE ────────────────────────────
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

// ── 12. RATIO ────────────────────────────
function setRatio(el) {
  document.querySelectorAll('.tb-group:last-of-type .tb-seg')
    .forEach(s => s.classList.remove('active'))
  el.classList.add('active')
}

// ── INIT ─────────────────────────────────
buildShotList()
btnCap.disabled = true