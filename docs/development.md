# Flux Platform — Руководство разработчика

## Требования

| Компонент | Версия               |
| --------- | -------------------- |
| Rust      | 1.70+                |
| Node.js   | 22+ (LTS)            |
| Windows   | 10/11 (64-bit)       |
| MSYS2     | Для сборки (MinGW64) |

> [!CAUTION] > **Technical Debt Warning**:  
> Проект содержит большое количество legacy-кода на фронтенде (особенно `chat.js`).
> Многие архитектурные слои (безопасность, модульность) реализованы как **Stubs**.
>
> **Missing/Fake APIs**:
>
> -   `/api/transcribe` - Не реализован (404/500).
> -   `/api/state` - Хардкод в `tauri-bridge.js`.
> -   `/api/download_model` - Симуляция в `downloader.rs`.
>     При разработке учитывайте, что документация описывает _целевое_, а не _текущее_ состояние.

---

## Быстрый старт

```powershell
# 1. Клонирование
git clone https://github.com/F0RLE/flux-platform.git
cd flux-platform

# 2. Установка зависимостей и запуск
cd scripts
./dev.ps1
```

Dev сервер Vite: `http://localhost:1420`

---

## Скрипты

| Скрипт                | Описание                         |
| --------------------- | -------------------------------- |
| `./scripts/dev.ps1`   | Dev режим с Vite hot-reload      |
| `./scripts/build.ps1` | Production сборка + installer    |
| `./scripts/clean.ps1` | Очистка target/, dist/, release/ |

---

## Структура проекта

.
├── .github/
│ ├── workflows/
│ │ └── release.yml
│ └── ...
├── .editorconfig
├── .gitignore
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── package.json
├── src-tauri/ # Rust + Tauri Backend
│ ├── src/
│ │ ├── commands/ # IPC слой (frontend -> backend)
│ │ │ ├── downloader.rs
│ │ │ ├── health.rs
│ │ │ ├── license.rs
│ │ │ ├── logs.rs
│ │ │ ├── modules.rs
│ │ │ ├── settings.rs
│ │ │ ├── system.rs
│ │ │ ├── theme.rs
│ │ │ ├── translations.rs
│ │ │ ├── window.rs
│ │ │ ├── window_settings.rs
│ │ │ └── mod.rs
│ │ ├── services/ # Бизнес-логика
│ │ │ ├── license/
│ │ │ ├── logs.rs
│ │ │ ├── module_controller.rs
│ │ │ ├── module_lifecycle.rs
│ │ │ ├── settings.rs
│ │ │ ├── system_monitor.rs
│ │ │ ├── theme.rs
│ │ │ ├── translations.rs
│ │ │ ├── window_settings.rs
│ │ │ └── mod.rs
│ │ ├── models/ # DTO (Структуры данных)
│ │ ├── utils/ # Хелперы
│ │ │ ├── paths.rs
│ │ │ ├── process.rs
│ │ │ ├── windows.rs
│ │ │ └── mod.rs
│ │ ├── errors.rs
│ │ ├── lib.rs # Регистрация команд
│ │ ├── main.rs # Точка входа
│ │ └── tests.rs
│ ├── tauri.conf.json # Конфиг Tauri
│ └── Cargo.toml
│
├── src/ # Vite + Vanilla JS Frontend
│ ├── js/
│ │ ├── core/ # Ядро
│ │ │ ├── core.js
│ │ │ ├── i18n.js
│ │ │ ├── tauri-bridge.js
│ │ │ ├── ui-state.js
│ │ │ └── window.js
│ │ ├── features/ # Логика страниц
│ │ │ ├── chat.js
│ │ │ ├── debug.js
│ │ │ ├── downloads.js
│ │ │ ├── modules.js
│ │ │ └── settings-ui.js
│ │ ├── ui/ # UI компоненты
│ │ │ ├── monitoring.js
│ │ │ ├── particles.js
│ │ │ ├── sidebar.js
│ │ │ ├── sound-fx.js
│ │ │ └── ui.js
│ │ ├── events/ # (Legacy/Empty)
│ │ └── data/ # (Legacy)
│ ├── css/
│ │ ├── base/
│ │ ├── components/
│ │ ├── layout/
│ │ ├── pages/
│ │ ├── main.css
│ │ └── styles-sysmon.css
│ ├── assets/
│ ├── dist/ # Скомпилированный фронтенд
│ ├── package.json
│ └── vite.config.ts
│
└── scripts/ # Автоматизация
├── bump-version.js
├── build_portable.ps1
├── clean-dev.ps1
├── dev.ps1
└── release.ps1

---

## Добавление новой команды

### 1. Создать сервис (services/)

```rust
// services/example.rs
pub fn do_work(param: &str) -> Result<String, String> {
    // Вся бизнес-логика здесь
    if param.is_empty() {
        return Err("param cannot be empty".to_string());
    }
    Ok(format!("Processed: {}", param))
}
```

### 2. Создать команду (commands/)

```rust
// commands/example.rs
use crate::services::example;

#[tauri::command]
pub fn my_command(param: String) -> Result<String, String> {
    // Только валидация + вызов сервиса
    example::do_work(&param)
}
```

### 3. Зарегистрировать в lib.rs

```rust
.invoke_handler(tauri::generate_handler![
    // ...
    example::my_command,
])
```

### 4. Добавить модуль

```rust
// commands/mod.rs
pub mod example;

// services/mod.rs
pub mod example;
```

### 5. Вызвать из JS

```javascript
const result = await window.__TAURI__.invoke("my_command", {
    param: "test",
});
```

---

## Подписка на события

Вместо polling используй события:

```javascript
// js/events/system.js
import { listen } from "@tauri-apps/api/event";

export async function subscribeToSystemStats(callback) {
    return await listen("system_stats", (event) => {
        callback(event.payload);
    });
}

// Использование
const unsub = await subscribeToSystemStats((stats) => {
    console.log("CPU:", stats.cpu.percent);
});

// При выходе
unsub();
```

---

## Локализация

Файлы: `src-tauri/resources/locales/`

| Файл      | Язык    |
| --------- | ------- |
| `en.json` | English |
| `ru.json` | Русский |
| `zh.json` | 中文    |

### Добавление перевода

1. Добавить ключ во все JSON
2. В HTML: `data-i18n="key.path"`
3. В JS: `i18n.t('key.path')`

---

## Лицензирование

```javascript
// Проверка статуса
const status = await invoke("get_license_status");
// { status: "Free" | "Pro" | "Enterprise", email: null }

// Проверка фичи
const canUse = await invoke("check_feature", { feature: "advanced_chat" });
```

Ключи форматы:

-   `PRO-XXXX-XXXX` → Pro tier
-   `ENT-XXXX-XXXX` → Enterprise tier

---

## Отладка

### Rust логи

```rust
log::info!("Debug message");
log::warn!("Warning");
log::error!("Error!");
```

### DevTools

`F12` в dev режиме для WebView DevTools.

### dlltool ошибка

Если видите `dlltool.exe not found`:

```powershell
$env:PATH = "C:\msys64\mingw64\bin;$env:PATH"
cargo build
```

Или используйте `./scripts/dev.ps1` — там PATH уже настроен.

---

## Сборка

```powershell
./scripts/build.ps1
```

Результат:

-   `release/FluxPlatform.exe`
-   `release/dist/*.msi`
-   `release/dist/*.exe` (NSIS installer)
