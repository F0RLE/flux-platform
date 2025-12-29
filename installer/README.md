# Flux Platform Installer

Discord-style установщик для Flux Platform.

## Структура

```
installer/
├── package.json           # Electron + electron-builder
├── src/
│   ├── main/
│   │   ├── main.js        # Electron main process
│   │   └── installer.js   # Installation logic
│   └── renderer/
│       ├── index.html     # UI
│       ├── styles.css     # Styles
│       └── app.js         # UI logic
└── resources/
    └── icon.ico           # App icon
```

## Разработка

```bash
cd installer
npm install
npm start
```

## Сборка EXE

```bash
npm run build:win
```

Результат: `dist/FluxPlatformSetup.exe`

## Что устанавливает

1. **Python 3.12 Portable** - для backend
2. **Electron** - для UI окна лаунчера
3. **MinGit** - для скачивания модулей с GitHub
4. **Flux Launcher** - код лаунчера с GitHub
5. **Python зависимости** - из requirements.txt
