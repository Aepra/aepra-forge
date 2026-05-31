# Run Project

Gunakan satu perintah ini dari root project untuk menyalakan database, backend, dan frontend:

```powershell
.\run-web.ps1
```

Apa yang dilakukan skrip itu:

- Menyalakan PostgreSQL lewat Docker Compose.
- Menjalankan backend FastAPI di `http://localhost:8000`.
- Menjalankan frontend Next.js di `http://localhost:3000`.

## Syarat pertama kali

Kalau belum pernah install dependency, jalankan sekali saja:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
cd apps\frontend
npm install
```

## Buka aplikasi

Setelah `run-web.ps1` berjalan, buka:

- Frontend: `http://localhost:3000`
- API docs: `http://localhost:8000/docs`

## Berhenti menjalankan project

Tutup jendela PowerShell yang dibuka oleh skrip, lalu jalankan:

```powershell
docker compose -f infra/docker-compose.yml down
```
