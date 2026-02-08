# Complier GUI

<p align="center">
  Desktop-first Prompt Compiler experience powered by Electron + FastAPI + Next.js.
</p>

<p align="center">
  <a href="https://github.com/kellecore/complier-gui/blob/main/LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-green.svg" /></a>
  <a href="https://github.com/kellecore/complier-gui"><img alt="Platform" src="https://img.shields.io/badge/platform-Windows-blue" /></a>
  <a href="https://nodejs.org/"><img alt="Node" src="https://img.shields.io/badge/node-%3E%3D18-339933" /></a>
  <a href="https://www.python.org/"><img alt="Python" src="https://img.shields.io/badge/python-%3E%3D3.10-3776AB" /></a>
</p>

## Overview

`Complier GUI`, [madara88645/Compiler](https://github.com/madara88645/Compiler) projesi temel alinip masaustu kullanim icin Electron ile paketlenmis bir surumdur.

Bu repo:
- `core/` altinda Compiler cekirdegini calistirir.
- `electron/main.js` ile backend + frontend servislerini otomatik baslatir.
- GUI icinden LLM provider/model/base URL/token ayarlarini yonetir.

## Features

- Electron tabanli masaustu arayuz
- Prompt compile + optimize + offline mod
- Context Manager (RAG) yukleme ve arama
- Quality Coach (validate/fix)
- Provider destegi:
  - OpenAI-compatible
  - OpenAI
  - Anthropic
  - Gemini
- TR/EN dil anahtari

## Project Structure

```text
complier-gui/
|- electron/            # Electron main process
|- core/                # Compiler core (API + web + cli + tests)
|- start_app.bat        # Windows tek komut baslatma
|- ATTRIBUTION.md       # Kaynak kullanim aciklamasi
`- README.md
```

## Quick Start

### 1) Requirements

- Node.js 18+
- Python 3.10+
- Windows (start script icin)

### 2) Install

```bash
npm install
npm run setup
```

### 3) Run

```bash
npm run dev
```

Windows tek tik:

```bat
start_app.bat
```

## Runtime Endpoints

- Backend: `http://127.0.0.1:8080`
- Frontend: `http://127.0.0.1:3000`

## LLM Provider Setup

Uygulama icindeki `LLM Settings` panelinden su alanlari doldur:
- Provider
- Base URL
- Model
- API Key

Ayarlar local olarak saklanir.

## Troubleshooting

### App acilmiyor / uzun bekliyor

- `core/web` icinde bagimliliklarin kurulu oldugunu kontrol et:
  - `npm run setup`
- Python paketlerini kontrol et:
  - `python -m pip install -r core/requirements.txt`

### Port cakismasi (3000 / 8080)

`start_app.bat` ve Electron acilisinda stale process temizligi var. Yine de gerekirse elle kapat:

```bat
for /f "tokens=5" %a in ('netstat -ano ^| findstr :8080 ^| findstr LISTENING') do taskkill /PID %a /T /F
for /f "tokens=5" %a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /PID %a /T /F
```

## Attribution

Bu proje, acik kaynak [madara88645/Compiler](https://github.com/madara88645/Compiler) calismasindan yararlanir.

Detayli kaynak kullanim notlari icin:
- [`ATTRIBUTION.md`](./ATTRIBUTION.md)
- [`LICENSE`](./LICENSE)

## License

MIT - see [`LICENSE`](./LICENSE).
