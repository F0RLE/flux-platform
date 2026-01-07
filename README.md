<div align="center">

# Flux Platform

[![Rust](https://img.shields.io/badge/Rust-1.70+-orange.svg?style=flat-square&logo=rust)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-v2-blue.svg?style=flat-square&logo=tauri)](https://tauri.app/)
[![Vite](https://img.shields.io/badge/Vite-v7-purple.svg?style=flat-square&logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows-lightgrey.svg?style=flat-square&logo=windows)](https://www.microsoft.com/windows)

<br/>

[![English](https://img.shields.io/badge/-English-grey?style=for-the-badge&logo=usb&logoColor=white&labelColor=002060)](#english) &nbsp;
[![Русский](https://img.shields.io/badge/-Русский-grey?style=for-the-badge&logo=usb&logoColor=white&labelColor=blue)](#russian) &nbsp;
[![中文](https://img.shields.io/badge/-中文-grey?style=for-the-badge&logo=usb&logoColor=white&labelColor=red)](#chinese)

</div>

---

<a name="english"></a>

## <img src="https://flagcdn.com/24x18/gb.png" valign="middle"> English

**Flux Platform** is a modular service management platform designed for high performance and minimal footprint. Built upon the **Rust** ecosystem and **Tauri v2**, it bridges the gap between native system execution and modern web interfaces, using a highly optimized native WebView.

> [!NOTE] > **CURRENT STATUS: UI SHELL & CORE PROTOTYPE**
>
> -   **Real Features**: System Monitor, Hardware Telemetry, Settings Persistence, Window Management, Release Automation.
> -   **Simulations (Stubs)**: AI Chat, Module Installation, Service Control.

### Core Architecture

-   **Rust Backend**: Handles system interactions, file I/O, and hardware telemetry (via `sysinfo` and `nvml-wrapper`).
-   **Frontend**: Built with **Vanilla JavaScript** and **Generic CSS**. No heavy frameworks (React/Vue/Angular) to ensure instant startup and low memory usage.
-   **Tauri v2**: Provides the secure IPC bridge between the web interface and the system backend.

### Features & Status

| Feature            | Status      | Details                                                                         |
| :----------------- | :---------- | :------------------------------------------------------------------------------ |
| **System Monitor** | ✅ **Real** | Real-time CPU, RAM, Disk, Network and NVIDIA GPU (NVML) stats.                  |
| **Settings**       | ✅ **Real** | Persisted to `%APPDATA%/FluxData/User/Configs/.env` & persisted language state. |
| **Window Control** | ✅ **Real** | Custom window controls (Minimize, Close, F11/Max Toggle).                       |
| **Automation**     | ✅ **Real** | Automated GitHub Releases and Version Bumping scripts.                          |
| **Module System**  | ❌ **Stub** | Interface only. No actual process management yet.                               |
| **AI Chat**        | ❌ **Stub** | UI demo. No LLM inference backend connected.                                    |

### Technology Stack

-   **Backend**: Rust (Tokio, Serde, Tauri)
-   **Frontend**: JavaScript (ES6+), CSS3 (Variables, Flexbox/Grid), HTML5
-   **Build & Dev**: Vite, NPM, Cargo
-   **Automation**: Node.js scripts (`bump-version.js`), GitHub Actions

### Quick Start (Development)

**Prerequisites:**

-   Windows 10/11 (x64)
-   [Rust](https://rustup.rs/) (Stable)
-   [Node.js](https://nodejs.org/) (LTS v20+)

```powershell
# 1. Clone repository
git clone https://github.com/F0RLE/flux-platform.git
cd flux-platform

# 2. Install dependencies
cd src
npm install
cd ..

# 3. Run Development Mode
npm run tauri:dev --prefix src
```

---

<a name="russian"></a>

## <img src="https://flagcdn.com/24x18/ru.png" valign="middle"> Русский

**Flux Platform** — это модульная платформа управления сервисами, созданная для высокой производительности. Основанная на **Rust** и **Tauri v2**, она объединяет мощь нативного кода с гибкостью веб-интерфейсов, используя системный WebView для минимизации размера и потребления ресурсов.

> [!NOTE] > **ТЕКУЩИЙ СТАТУС: UI ОБОЛОЧКА И ЯДРО**
>
> -   **Реализовано**: Системный монитор, Телеметрия железа, Сохранение настроек, Управление окном, Автоматизация релизов.
> -   **Заглушки (Stubs)**: AI Чат, Установка модулей, Управление сервисами.

### Архитектура

-   **Rust Backend**: Отвечает за системные вызовы, работу с файлами и телеметрию (через `sysinfo` и `nvml-wrapper`).
-   **Frontend**: Написан на **чистом JavaScript** и **CSS**. Отсутствие тяжелых фреймворков (React/Vue) гарантирует мгновенный запуск.
-   **Tauri v2**: Обеспечивает безопасный мост (IPC) между интерфейсом и системой.

### Статус Функций

| Функция              | Статус          | Описание                                                            |
| :------------------- | :-------------- | :------------------------------------------------------------------ |
| **Мониторинг**       | ✅ **Реален**   | CPU, RAM, Диск, Сеть и NVIDIA GPU (NVML) в реальном времени.        |
| **Настройки**        | ✅ **Реальны**  | Сохранение в `%APPDATA%/FluxData/User/Configs/.env` и память языка. |
| **Управление окном** | ✅ **Реально**  | Свернуть, Закрыть, F11/Максимизация.                                |
| **Автоматизация**    | ✅ **Реальна**  | Скрипты для GitHub Releases и поднятия версий.                      |
| **Модули**           | ❌ **Заглушка** | Только интерфейс. Реального запуска процессов нет.                  |
| **AI Чат**           | ❌ **Заглушка** | Демо интерфейса. Подключения к LLM нет.                             |

### Стек Технологий

-   **Backend**: Rust (Tokio, Serde, Tauri)
-   **Frontend**: JavaScript (ES6+), CSS3, HTML5
-   **Сборка**: Vite, NPM, Cargo
-   **Автоматизация**: Node.js скрипты, GitHub Actions

### Запуск (Development)

**Требования:**

-   Windows 10/11 (x64)
-   [Rust](https://rustup.rs/) (Stable)
-   [Node.js](https://nodejs.org/) (LTS v20+)

```powershell
# 1. Клонирование
git clone https://github.com/F0RLE/flux-platform.git
cd flux-platform

# 2. Установка зависимостей
cd src
npm install
cd ..

# 3. Запуск в режиме разработки
npm run tauri:dev --prefix src
```

---

<a name="chinese"></a>

## <img src="https://flagcdn.com/24x18/cn.png" valign="middle"> 中文

**Flux Platform** 是一个专注于高性能和最小占用的模块化服务管理平台。基于 **Rust** 和 **Tauri v2** 构建，它利用高度优化的原生 WebView，架起了原生系统执行与现代 Web 界面之间的桥梁。

> [!NOTE] > **当前状态：UI 外壳与核心原型**
>
> -   **真实功能**: 系统监控，硬件遥测，设置持久化，窗口管理，发布自动化。
> -   **模拟 (Stubs)**: AI 聊天，模块安装，服务控制。

### 核心架构

-   **Rust 后端**: 处理系统交互、文件 I/O 和硬件遥测（通过 `sysinfo` 和 `nvml-wrapper`）。
-   **前端**: 使用 **原生 JavaScript** 和 **CSS** 构建。没有沉重的框架（React/Vue），确保瞬间启动和低内存占用。
-   **Tauri v2**: 提供 Web 界面与系统后端之间的安全 IPC 桥梁。

### 功能状态

| 功能         | 状态        | 详情                                                         |
| :----------- | :---------- | :----------------------------------------------------------- |
| **系统监控** | ✅ **真实** | 实时 CPU, RAM, 磁盘, 网络和 NVIDIA GPU (NVML) 统计。         |
| **设置**     | ✅ **真实** | 持久化到 `%APPDATA%/FluxData/User/Configs/.env` 及语言记忆。 |
| **窗口控制** | ✅ **真实** | 自定义窗口控制（最小化，关闭，F11/最大化切换）。             |
| **自动化**   | ✅ **真实** | GitHub Releases 自动化和版本升级脚本。                       |
| **模块系统** | ❌ **模拟** | 仅界面。尚无实际进程管理。                                   |
| **AI 聊天**  | ❌ **模拟** | UI 演示。未连接 LLM 推理后端。                               |

### 技术栈

-   **后端**: Rust (Tokio, Serde, Tauri)
-   **前端**: JavaScript (ES6+), CSS3, HTML5
-   **构建**: Vite, NPM, Cargo
-   **自动化**: Node.js 脚本, GitHub Actions

### 快速开始 (Development)

**先决条件:**

-   Windows 10/11 (x64)
-   [Rust](https://rustup.rs/) (Stable)
-   [Node.js](https://nodejs.org/) (LTS v20+)

```powershell
# 1. 克隆仓库
git clone https://github.com/F0RLE/flux-platform.git
cd flux-platform

# 2. 安装依赖
cd src
npm install
cd ..

# 3. 运行开发模式
npm run tauri:dev --prefix src
```

---

<div align="center">
  <p>
    <b>Proprietary Software</b><br>
    Copyright © 2026 F0RLE. All Rights Reserved.
  </p>
</div>
