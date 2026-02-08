# Complier GUI

Electron masaustu uygulamasi + full Prompt Compiler core.

## Kaynak ve attribution

Bu proje, asagidaki acik kaynak projeden yararlanilarak olusturulmustur:

- Source repo: [madara88645/Compiler](https://github.com/madara88645/Compiler)
- Lisans: MIT

Detayli attribution ve neyin kopyalanip neyin degistirildigi:

- `ATTRIBUTION.md`

## Proje yapisi

- `core/` -> Orijinal Compiler kod tabani (FastAPI + Next.js + CLI + tests)
- `electron/main.js` -> Backend ve frontend servislerini otomatik baslatan Electron main process
- `start_app.bat` -> Windows tek tik acilis

## Desteklenen providerlar

- OpenAI-compatible
- OpenAI
- Anthropic
- Gemini

Runtime ayarlar:

- Provider / model / base URL / API key UI uzerinden girilebilir.
- Varsayilan env tabanli ayarlar `core/.env` dosyasindan okunur.

## Kurulum

```bash
cd complier-gui
npm install
npm run setup
```

## Calistirma

```bash
npm run dev
```

Windows:

```bat
start_app.bat
```

## Servis adresleri

- Backend: `http://127.0.0.1:8080`
- Frontend: `http://127.0.0.1:3000`

## Not

Uygulama kapanirken backend ve frontend child processleri temizlenir.
