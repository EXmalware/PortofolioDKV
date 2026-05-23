# Nilai Portofolio DKV

Web app statis untuk menampilkan **nilai portofolio / tugas** siswa Desain Komunikasi Visual (Kelas XI & XII) dari Google Spreadsheet.

**Guru Mata Pelajaran:** David Faizal, S.Kom.  
**SMK Negeri 1 Bumijawa**

## Fitur

- Navigasi kartu: **Angkatan** → **Kelas** → **Siswa**
- Data dari sheet `XI DKV` & `XII DKV`
- Nama tugas & jenis (Mandiri/Kelompok) dari sheet `REFF`
- Mata pelajaran per tingkat dari sheet `MAPEL`
- Filter semester (5 tugas per semester)
- Pencarian nama / NIS
- Tampilan responsif (desktop & mobile)
- Tema Gundam RX-78

## Persyaratan spreadsheet

Spreadsheet harus dibagikan: **Siapa saja dengan tautan dapat melihat**.

ID spreadsheet dikonfigurasi di `js/app.js` (`SHEET_ID`).

## Struktur proyek

```
index.html          # Halaman utama
css/styles.css      # Gaya tampilan
js/app.js           # Logika & fetch data
```

## Menjalankan lokal

```powershell
cd "d:\Cursor\NILAI PORTOFOLIO"
python -m http.server 8080
```

Buka: http://localhost:8080

## Deploy ke GitHub Pages

1. Buat repository baru di GitHub (mis. `nilai-portofolio-dkv`)
2. Push kode ke branch `main`
3. Di repository: **Settings** → **Pages**
4. **Source:** Deploy from branch → `main` → folder `/ (root)`
5. Simpan — situs aktif di `https://<username>.github.io/<nama-repo>/`

Tidak perlu build; cukup file HTML/CSS/JS statis.

## Unggah ke GitHub (pertama kali)

```powershell
cd "d:\Cursor\NILAI PORTOFOLIO"

git init
git add .
git commit -m "Initial commit: Nilai Portofolio DKV web app"

git branch -M main
git remote add origin https://github.com/USERNAME/nilai-portofolio-dkv.git
git push -u origin main
```

Ganti `USERNAME` dan nama repository sesuai akun GitHub Anda.

## Lisensi

Proyek untuk keperluan pendidikan internal SMK Negeri 1 Bumijawa.
