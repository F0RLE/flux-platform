use once_cell::sync::Lazy;
// use serde::Serialize; -- removed redundant import
use std::sync::Mutex;
use std::time::Instant;
use sysinfo::{CpuRefreshKind, MemoryRefreshKind, Networks, RefreshKind, System};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

use crate::models::{SystemStats, CpuStats, RamStats, DiskStats, NetworkStats};

struct Monitor {
    sys: System,
    networks: Networks,
    last_update: Instant,
    last_net_recv: u64,
    last_net_sent: u64,
}

static MONITOR: Lazy<Mutex<Monitor>> = Lazy::new(|| {
    Mutex::new(Monitor {
        sys: System::new_with_specifics(
            RefreshKind::new()
                .with_cpu(CpuRefreshKind::everything())
                .with_memory(MemoryRefreshKind::everything()),
        ),
        networks: Networks::new_with_refreshed_list(),
        last_update: Instant::now(),
        last_net_recv: 0,
        last_net_sent: 0,
    })
});

pub fn get_stats() -> SystemStats {
    let mut monitor = MONITOR.lock().unwrap();
    monitor.sys.refresh_cpu_all();
    monitor.sys.refresh_memory();
    monitor.networks.refresh();

    let now = Instant::now();
    let elapsed = now.duration_since(monitor.last_update).as_secs_f64();

    let cpu_percent = monitor.sys.global_cpu_usage();
    let cpus = monitor.sys.cpus();
    let cpu_name = cpus.first().map(|c| c.brand().to_string()).unwrap_or_else(|| "Unknown".to_string());
    let cpu_cores = cpus.len();

    let total_memory = monitor.sys.total_memory() as f64;
    let used_memory = monitor.sys.used_memory() as f64;
    let available_memory = monitor.sys.available_memory() as f64;
    let ram_percent = if total_memory > 0.0 { (used_memory / total_memory * 100.0) as f32 } else { 0.0 };

    let mut total_recv: u64 = 0;
    let mut total_sent: u64 = 0;
    for (_name, data) in monitor.networks.iter() {
        total_recv += data.total_received();
        total_sent += data.total_transmitted();
    }

    let download_rate = if elapsed > 0.0 && monitor.last_net_recv > 0 { (total_recv.saturating_sub(monitor.last_net_recv)) as f64 / elapsed } else { 0.0 };
    let upload_rate = if elapsed > 0.0 && monitor.last_net_sent > 0 { (total_sent.saturating_sub(monitor.last_net_sent)) as f64 / elapsed } else { 0.0 };

    monitor.last_update = now;
    monitor.last_net_recv = total_recv;
    monitor.last_net_sent = total_sent;

    let bytes_to_gb = |b: f64| (b / 1024.0 / 1024.0 / 1024.0) as f32;

    SystemStats {
        cpu: CpuStats { percent: cpu_percent, cores: cpu_cores, name: cpu_name },
        ram: RamStats { percent: ram_percent, used_gb: bytes_to_gb(used_memory), total_gb: bytes_to_gb(total_memory), available_gb: bytes_to_gb(available_memory) },
        disk: DiskStats { read_rate: 0.0, write_rate: 0.0, utilization: 0.0, total_gb: 0.0, used_gb: 0.0 },
        network: NetworkStats { download_rate, upload_rate, total_received: total_recv, total_sent: total_sent, utilization: 0.0 },
        pid: std::process::id(),
    }
}

static MONITORING_ACTIVE: AtomicBool = AtomicBool::new(false);

pub fn start_monitoring(app: AppHandle, interval_ms: u64) {
    if MONITORING_ACTIVE.swap(true, Ordering::SeqCst) { return; }

    std::thread::spawn(move || {
        loop {
            if !MONITORING_ACTIVE.load(Ordering::SeqCst) { break; }
            let stats = get_stats();
            let _ = app.emit("system_stats", &stats);
            std::thread::sleep(Duration::from_millis(interval_ms));
        }
    });
}
