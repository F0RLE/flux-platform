<details>
<summary><b>🇨🇳 中文 (点击展开)</b></summary>

# 🚀 Flux Platform

[![Python](https://img.shields.io/badge/Python-3.10--3.14-blue.svg)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Windows](https://img.shields.io/badge/Platform-Windows-lightgrey.svg)](https://www.microsoft.com/windows)
[![GitHub](https://img.shields.io/badge/GitHub-F0RLE-black.svg)](https://github.com/F0RLE)

> 强大的服务管理平台和启动器

**版本:** 1.2.0 | **最后更新:** 2025-01-01

---

## 🎯 这是什么？

**Flux Platform** 是一个通用的服务管理平台，旨在简化模块化应用程序的部署、监控和管理。它提供了一个现代化的 Web 界面，用于通过统一的仪表板处理服务、监控系统资源和查看日志。

## ✨ 主要功能

| 功能 | 描述 |
|------|------|
| 🚀 **Web启动器** | 现代化的 Web 界面，用于管理所有组件 |
| 📊 **实时监控** | CPU、GPU、RAM、VRAM、磁盘、网络，带颜色指示 |
| 🔄 **模块管理** | 可扩展的模块系统，支持安装和管理自定义服务 |
| 💬 **聊天界面** | 与 LLM 和图像生成服务集成 |
| 🌐 **多语言** | 支持英语、俄语、中文 |
| 🛡️ **安全** | 路径遍历保护，速率限制，数据验证 |
| 📋 **日志** | 详细的系统和交互日志 |

## 📋 要求

- Windows 10/11 (64-bit)
- Python 3.10 - 3.14
- 互联网连接（首次设置）

## 🛠️ 快速开始

### 从源码运行

```bash
# 克隆仓库
git clone https://github.com/F0RLE/flux-platform.git
cd flux-platform

# 安装依赖
pip install -r requirements.txt

# 运行
python -m backend
```

### 使用安装程序

1. 从 Releases 下载 `FluxPlatformSetup.exe`
2. 运行安装程序
3. 启动器将自动打开

## ⚙️ 配置

在 `%APPDATA%/FluxData/User/Configs/.env` 中配置：

```env
LANGUAGE=zh          # 界面语言 (en, ru, zh)
USE_GPU=true         # 启用 GPU 加速
DEBUG_MODE=false     # 详细日志
PORT=18888           # HTTP 服务器端口
```

## 📁 项目结构

```
flux-platform/
├── src/
│   ├── backend/           # Python 后端 (HTTP 服务器，API)
│   │   ├── config/        # 配置和路径
│   │   ├── i18n/          # 国际化 (en, ru, zh)
│   │   ├── app.py         # 主应用逻辑
│   │   ├── server.py      # HTTP 服务器
│   │   └── process.py     # 进程管理
│   ├── frontend/          # Web 界面
│   │   └── web/
│   │       ├── css/       # 样式
│   │       ├── js/        # JavaScript 模块
│   │       └── index.html # 主页面
│   └── tauri/             # Tauri 桌面应用
├── installer/             # Electron 安装程序
├── scripts/               # 构建脚本
├── tests/                 # 单元测试
└── requirements.txt
```

## 📄 许可证

**专有软件** — Copyright (c) 2025 F0RLE. 保留所有权利。

</details>

---

<details>
<summary><b>🇷🇺 Русский (Нажмите, чтобы развернуть)</b></summary>

# 🚀 Flux Platform

[![Python](https://img.shields.io/badge/Python-3.10--3.14-blue.svg)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Windows](https://img.shields.io/badge/Platform-Windows-lightgrey.svg)](https://www.microsoft.com/windows)
[![GitHub](https://img.shields.io/badge/GitHub-F0RLE-black.svg)](https://github.com/F0RLE)

> Мощная платформа для управления сервисами и запуска приложений

**Версия:** 1.2.0 | **Последнее обновление:** 2025-01-01

---

## 🎯 Что это?

**Flux Platform** — это универсальная платформа управления сервисами, предназначенная для упрощения развертывания, мониторинга и управления модульными приложениями. Она предоставляет современный веб-интерфейс для работы с сервисами, мониторинга системных ресурсов и просмотра логов через единую панель управления.

## ✨ Основные возможности

| Функция | Описание |
|---------|----------|
| 🚀 **Веб-лаунчер** | Современный веб-интерфейс для управления всеми компонентами |
| 📊 **Мониторинг** | CPU, GPU, RAM, VRAM, Disk, Network в реальном времени |
| 🔄 **Модули** | Расширяемая система модулей для сервисов |
| 💬 **Чат** | Интеграция с LLM и генерацией изображений |
| 🌐 **Мультиязык** | Поддержка английского, русского, китайского |
| 🛡️ **Безопасность** | Защита от path traversal, rate limiting, валидация |
| 📋 **Логирование** | Детальные логи системы и взаимодействий |

## 📋 Требования

- Windows 10/11 (64-bit)
- Python 3.10 - 3.14
- Интернет-соединение (для первоначальной настройки)

## 🛠️ Быстрый старт

### Запуск из исходников

```bash
# Клонируем репозиторий
git clone https://github.com/F0RLE/flux-platform.git
cd flux-platform

# Устанавливаем зависимости
pip install -r requirements.txt

# Запускаем
python -m backend
```

### Использование установщика

1. Скачайте `FluxPlatformSetup.exe` из Releases
2. Запустите установщик
3. Лаунчер откроется автоматически

## ⚙️ Конфигурация

Настройки в `%APPDATA%/FluxData/User/Configs/.env`:

```env
LANGUAGE=ru          # Язык интерфейса (en, ru, zh)
USE_GPU=true         # Использовать GPU
DEBUG_MODE=false     # Подробное логирование
PORT=18888           # Порт HTTP-сервера
```

Переменные окружения (приоритет выше .env):

```bash
FLUX_PORT=18888
FLUX_LANGUAGE=ru
FLUX_DEBUG=false
```

## 📁 Структура проекта

```
flux-platform/
├── src/
│   ├── backend/           # Python бэкенд (HTTP сервер, API)
│   │   ├── config/        # Конфигурация и пути
│   │   ├── i18n/          # Локализация (en, ru, zh)
│   │   ├── app.py         # Основная логика приложения
│   │   ├── server.py      # HTTP сервер
│   │   └── process.py     # Управление процессами
│   ├── frontend/          # Веб-интерфейс
│   │   └── web/
│   │       ├── css/       # Стили
│   │       ├── js/        # JavaScript модули
│   │       └── index.html # Главная страница
│   └── tauri/             # Tauri десктоп-приложение
├── installer/             # Electron установщик
├── scripts/               # Скрипты сборки
├── tests/                 # Unit-тесты
└── requirements.txt
```

## 🧪 Тестирование

```bash
# Запуск всех тестов
pytest tests/ -v

# Запуск конкретного теста
pytest tests/test_core_services.py -v
```

## 📄 Лицензия

**Проприетарное ПО** — Copyright (c) 2025 F0RLE. Все права защищены.

</details>

---

# 🚀 Flux Platform

[![Rust](https://img.shields.io/badge/Rust-1.70+-orange.svg)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-v2-blue.svg)](https://tauri.app/)
[![Vite](https://img.shields.io/badge/Vite-v6-purple.svg)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Windows](https://img.shields.io/badge/Platform-Windows-lightgrey.svg)](https://www.microsoft.com/windows)
[![GitHub](https://img.shields.io/badge/GitHub-F0RLE-black.svg)](https://github.com/F0RLE)

> Powerful service management platform and launcher

**Version:** 1.2.0 | **Last Updated:** 2025-01-01

---

## 🎯 What is this?

**Flux Platform** is a universal service management platform designed to simplify the deployment, monitoring, and management of modular applications. It provides a modern web interface for handling services, monitoring system resources, and viewing logs through a unified dashboard.

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🚀 **Web Launcher** | Modern web interface for managing all components |
| 📊 **Real-time Monitoring** | CPU, GPU, RAM, VRAM, Disk, Network with color indicators |
| 🔄 **Module System** | Extensible module system for installing and managing services |
| 💬 **Chat Interface** | Integrated chat with LLM and image generation services |
| 🌐 **Multi-language** | Support for English, Russian, and Chinese |
| 🛡️ **Security** | Path traversal protection, rate limiting, input validation |
| 📋 **Logging** | Detailed system and interaction logs |

## 📋 Requirements

- Windows 10/11 (64-bit)
- [Rust](https://rustup.rs/) 1.70+
- [Node.js](https://nodejs.org/) 18+ with npm
- Internet connection (for initial setup)

## 🛠️ Quick Start

### Running from Source

```bash
# Clone the repository
git clone https://github.com/F0RLE/flux-platform.git
cd flux-platform

# Install frontend dependencies
cd source/frontend && npm install

# Run in development mode (with hot-reload)
cd ../tools && ./dev.ps1

# Or run directly with Cargo
cd ../backend && cargo tauri dev
```

### Building for Production

```bash
cd source/tools && ./build.ps1
```

The installer will be created in `source/backend/target/release/bundle/`

### Using the Installer

1. Download `FluxPlatformSetup.exe` from Releases
2. Run the installer
3. The launcher will open automatically

## ⚙️ Configuration

Configuration file location: `%APPDATA%/FluxData/User/Configs/.env`

```env
# Interface language (en, ru, zh)
LANGUAGE=en

# Enable GPU acceleration
USE_GPU=true

# Enable verbose logging
DEBUG_MODE=false

# HTTP server port
PORT=18888
```

Environment variables (higher priority than .env):

```bash
FLUX_PORT=18888
FLUX_LANGUAGE=en
FLUX_DEBUG=false
```

## 📁 Project Structure

```
flux-platform/
├── .github/               # CI/CD workflows
├── source/
│   ├── backend/           # Rust + Tauri backend
│   │   ├── src/
│   │   │   ├── commands/  # Tauri IPC commands
│   │   │   ├── models/    # Data structures
│   │   │   ├── services/  # Business logic
│   │   │   └── utils/     # Utilities
│   │   ├── resources/     # Localization files
│   │   ├── Cargo.toml     # Rust dependencies
│   │   └── tauri.conf.json
│   ├── frontend/          # Vite + TypeScript frontend
│   │   ├── css/           # Modular stylesheets
│   │   │   ├── base/      # Variables, reset, animations
│   │   │   ├── components/# UI components
│   │   │   ├── layout/    # Sidebar, controls
│   │   │   └── pages/     # Page-specific styles
│   │   ├── js/            # JavaScript modules
│   │   │   ├── core/      # Core, i18n, window, tauri-bridge
│   │   │   ├── features/  # Chat, modules, settings, downloads
│   │   │   └── ui/        # UI components, particles
│   │   ├── assets/        # Fonts, icons
│   │   ├── index.html     # Main dashboard
│   │   ├── vite.config.ts # Vite configuration
│   │   └── package.json
│   └── tools/             # Build scripts (PowerShell)
├── LICENSE
└── README.md
```

## 🔌 Tauri Commands

Flux Platform uses Tauri IPC commands instead of HTTP API:

| Command | Description |
|---------|-------------|
| `get_health` | Health check |
| `get_system_stats` | System monitoring (CPU, RAM, GPU, Disk, Network) |
| `get_gpu_info` | GPU information via NVML |
| `get_settings` / `save_settings` | Settings management |
| `get_translations` | Get translations for language |
| `get_modules` / `control_module` | Module management |
| `get_logs` / `clear_logs` / `add_log` | Logging |
| `start_download` | Download files |
| `minimize_window` / `maximize_window` / `close_window` | Window controls |

## 🧪 Development

```bash
# Frontend development with hot-reload
cd source/frontend && npm run dev

# Run Tauri in dev mode
cd source/backend && cargo tauri dev

# Build production bundle
cd source/backend && cargo tauri build
```

## 🛡️ Security Features

- **Path Traversal Protection**: Locale files are validated with whitelist
- **Input Validation**: Language codes and file names are sanitized
- **Rate Limiting**: Built-in protection against excessive requests
- **Process Isolation**: Windows Job Objects for clean process termination

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## 📄 License

**Proprietary Software**  
Copyright (c) 2025 F0RLE. All Rights Reserved.

See [LICENSE](LICENSE) for full terms.
