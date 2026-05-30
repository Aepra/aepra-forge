# Aepra-Forge Project Overview

Dokumen ini menjelaskan kondisi project Aepra-Forge berdasarkan struktur file yang ada sekarang di workspace ini. Isi di bawah hanya merangkum hal yang benar-benar ditemukan di repo saat ini.

## Project Ini Apa

Aepra-Forge adalah project web yang memakai dua bagian utama:

- Frontend Next.js di `apps/frontend`
- Backend FastAPI di `backend`

Frontend menampilkan dashboard, project list, dan editor visual. Backend menyediakan API FastAPI untuk endpoint build generator dan router data sederhana.

## Struktur Yang Ada Sekarang

- `backend/main.py` menjadi entrypoint FastAPI yang bisa dijalankan dengan `uvicorn backend.main:app`
- `backend/app_main.py` berisi aplikasi FastAPI utama
- `backend/app/backand/` berisi router API sederhana untuk `users`, `identities`, `products`, dan `admins`
- `backend/app/backand_product/` sekarang berisi stub generator ZIP
- `backend/app/database/store.py` berisi helper file-based storage untuk snapshot schema
- `backend/app/schemas/blueprint.py` berisi model `ProjectBlueprint`
- `apps/frontend/` berisi aplikasi Next.js

Folder `apps/backend` sudah dihapus, jadi backend sekarang ada di root project.

## Backend Yang Ada Sekarang

File `backend/app_main.py` membuat FastAPI app dan memasang:

- CORS middleware
- TrustedHost middleware
- rate limiter sederhana berbasis sliding window
- security check untuk token build dan origin
- route `/api/v1/generator/build`
- route `/api/v1/*` dari router `backand`

Endpoint yang terlihat di backend sekarang:

- `GET /` untuk status backend
- `POST /api/v1/generator/build` untuk build project ZIP
- `GET/POST /api/v1/users`
- `GET/POST /api/v1/identities`
- `GET/POST /api/v1/products`
- `GET/POST /api/v1/admins`

Catatan penting: generator ZIP di `backend/app/backand_product/__init__.py` sekarang masih stub. Fungsi `build_fastapi_project_zip()` hanya membuat ZIP minimal berisi `README.md` placeholder.

## Frontend Yang Ada Sekarang

Frontend memakai Next.js. Dari `apps/frontend/package.json`, script yang ada adalah:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

Halaman yang terlihat dari file yang diperiksa:

- `apps/frontend/src/app/(home)/page.tsx` menampilkan `HomeDashboard`
- `apps/frontend/src/app/(auth)/login/page.tsx` adalah halaman login
- `apps/frontend/src/app/(app)/projects/page.tsx` menampilkan `ProjectsDashboard`
- `apps/frontend/src/app/(app)/architect/page.tsx` menampilkan `ArchitectDashboard`

## Alur Project

### 1. Masuk ke aplikasi

Halaman login ada di `apps/frontend/src/app/(auth)/login/page.tsx`. Di file ini, login dilakukan lewat Google atau GitHub dan setelah itu diarahkan ke `/projects`.

### 2. Buka home

Halaman home (`apps/frontend/src/app/(home)/page.tsx`) hanya me-render `HomeDashboard`. Dari komponen ini ada tombol `Start Building` yang mengarah ke `/projects`.

### 3. Buka daftar project

`ProjectsDashboard` memperlihatkan daftar project lokal, lalu menyediakan aksi:

- create project baru
- open project
- delete project

Saat project dibuka, frontend menyimpan `currentProjectId` lalu pindah ke `/architect`.

### 4. Masuk ke editor architect

`ArchitectDashboard` memakai `ReactFlowProvider` dan menampilkan:

- sidebar
- toolbar
- editor canvas
- preview panel

Di dashboard ini ada state untuk:

- tema tampilan
- mode garis relasi
- preview visible / hidden
- nama project aktif

### 5. Simpan schema dari frontend

Route `apps/frontend/src/app/api/schema/save/route.ts` melakukan:

- cek session login
- validasi payload
- cek rate limit
- upsert user ke Prisma
- create / update project
- simpan schema JSON ke tabel `schema`

### 6. Generate project dari frontend ke backend

Route `apps/frontend/src/app/api/generator/build/route.ts` melakukan proxy ke backend. Alurnya:

- cek session login
- cek rate limit
- pastikan framework yang dipakai `fastapi`
- baca `BACKEND_INTERNAL_URL` atau `NEXT_PUBLIC_BACKEND_URL`
- default fallback ke `http://localhost:8000`
- kirim request POST ke backend `/api/v1/generator/build`
- jika sukses, response ZIP diteruskan ke browser

## Hubungan Frontend Dan Backend

Hubungannya sekarang memakai localhost:

- Frontend Next.js berjalan sendiri
- Frontend API route memanggil backend FastAPI lewat URL localhost
- Backend menerima request build dan mengembalikan ZIP

Jadi frontend adalah UI utama, sedangkan backend adalah API FastAPI yang dipanggil oleh frontend.

## Ringkasan Singkat Alur

1. User buka frontend Next.js
2. Login lewat Google atau GitHub
3. Masuk ke `/projects`
4. Buat atau buka project
5. Masuk ke `/architect`
6. Simpan schema lewat API route frontend
7. Generate project lewat API route frontend
8. API route frontend meneruskan request ke backend FastAPI
9. Backend mengembalikan ZIP

## Catatan Saat Ini

- Backend sekarang sudah dipindah ke root `backend/`
- Folder `apps/backend` sudah dihapus
- Generator backend masih stub, jadi output ZIP yang ada sekarang masih placeholder
- Penjelasan di file ini tidak menambahkan fitur yang tidak ditemukan di file yang diperiksa
