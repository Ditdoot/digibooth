# 📸 Digibooth

Digital photo booth web app — ambil foto langsung dari browser, pilih filter, dan download hasilnya dalam berbagai template layout.

🔗 **Live demo:** [digibooth-blond.vercel.app](https://digibooth-blond.vercel.app)

---

## ✨ Fitur

- 🎥 **Kamera live** — akses kamera langsung dari browser, tidak perlu install apapun
- 🎨 **Filter real-time** — Normal, Black & White, Warm, Fade, Vivid, Cool, Vintage
- 🖼 **Template layout** — Single, Strip ×2, Strip ×4, Grid 2×2
- ⏱ **Timer countdown** — Off, 3s, 5s, 10s
- ↔ **Mirror / flip** — balik kamera horizontal
- 📐 **Pilihan rasio** — 4:3, 1:1 (square), 16:9
- 🗂 **Gallery per sesi** — foto dikelompokkan per set, bisa download individual atau satu set sekaligus
- 📥 **Download PNG** — hasil foto digabung otomatis sesuai template
- 📱 **Responsive** — bisa dipakai di laptop maupun HP

---

## 🚀 Cara pakai

Tidak perlu install apapun. Cukup buka di browser:

```
https://digibooth-blond.vercel.app
```

1. Klik **Izinkan Kamera** saat browser meminta izin
2. Pilih **filter** di sidebar kiri
3. Pilih **template** di inspector kanan
4. Set **timer** dan **rasio** sesuai kebutuhan
5. Klik **Capture** — ambil foto sesuai jumlah slot template
6. Klik **Download Result** untuk download hasil akhir
7. Buka tab **Gallery** untuk lihat semua sesi foto

---

## 🛠 Tech stack

| Teknologi | Digunakan untuk |
|---|---|
| HTML5 | Struktur halaman |
| CSS3 + Flexbox | Layout dan styling |
| Vanilla JavaScript | Logika aplikasi |
| Canvas 2D API | Capture foto, apply filter, compose layout |
| MediaDevices API | Akses kamera browser |
| Blob API | Download hasil foto |
| Web Share API | Share foto ke sosmed (mobile) |

Tidak menggunakan framework atau library eksternal — pure HTML, CSS, JS.

---

## 💻 Local development

### Prasyarat
- [VS Code](https://code.visualstudio.com/)
- Extension [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)

### Langkah

```bash
# 1. Clone repository
git clone https://github.com/Ditdoot/digibooth.git

# 2. Masuk ke folder
cd digibooth

# 3. Buka di VS Code
code .
```

Lalu klik tombol **Go Live** di pojok kanan bawah VS Code.

> ⚠️ **Penting:** Kamera hanya bisa diakses lewat `localhost` atau HTTPS. Jangan buka file HTML langsung (double-click) karena kamera tidak akan berfungsi.

---

## 📁 Struktur project

```
digibooth/
├── index.html      # Struktur halaman dan komponen UI
├── script.js       # Logika aplikasi (kamera, filter, gallery, download)
├── style.css       # Styling dan responsive layout
├── .gitignore      # File yang diabaikan Git
└── README.md       # Dokumentasi ini
```

---

## 🔄 Workflow development

```bash
# Setelah edit kode, push ke GitHub
git add .
git commit -m "feat: deskripsi perubahan"
git push
```

Vercel otomatis deploy ulang setiap ada push ke branch `main`. Website terupdate dalam 30–60 detik.

---

## 📋 Konvensi commit message

| Prefix | Artinya |
|---|---|
| `feat:` | Fitur baru |
| `fix:` | Perbaikan bug |
| `style:` | Perubahan tampilan / CSS |
| `refactor:` | Restruktur kode tanpa ubah fungsi |
| `chore:` | Maintenance (update deps, gitignore, dll) |

---

## 🎯 Roadmap

- [x] Kamera live feed
- [x] Filter real-time
- [x] Template layout (Single, Strip, Grid)
- [x] Timer countdown
- [x] Mirror / flip
- [x] Rasio aspek (4:3, 1:1, 16:9)
- [x] Gallery per sesi
- [x] Download PNG
- [x] Responsive mobile layout
- [ ] Frame / overlay dekoratif
- [ ] Custom branding per klien
- [ ] QR code hasil foto

---

## 👩‍💻 Developer

**Alexa (Ditdoot)**
Mahasiswa CS semester 2 — BINUS University Bandung

---

*Dibuat dengan HTML, CSS, dan JavaScript murni — tanpa framework.*
