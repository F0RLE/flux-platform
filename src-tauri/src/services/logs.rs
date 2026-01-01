use std::sync::Mutex;
use once_cell::sync::Lazy;
use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Clone)]
pub struct LogEntry {
    pub timestamp: f64,
    pub source: String,
    pub level: String,
    pub message: String,
}

struct LogStore {
    entries: Vec<LogEntry>,
}

static LOG_STORE: Lazy<Mutex<LogStore>> = Lazy::new(|| {
    Mutex::new(LogStore {
        entries: Vec::with_capacity(500),
    })
});

pub fn add_log(message: &str, source: &str, level: &str) {
    let mut store = LOG_STORE.lock().unwrap();

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs_f64();

    store.entries.push(LogEntry {
        timestamp: now,
        source: source.to_string(),
        level: level.to_string(),
        message: message.to_string(),
    });

    if store.entries.len() > 500 {
        store.entries.remove(0);
    }
}

pub fn get_logs_since(since: f64) -> Vec<LogEntry> {
    let store = LOG_STORE.lock().unwrap();
    store.entries.iter()
        .filter(|e| e.timestamp > since)
        .cloned()
        .collect()
}

pub fn clear_logs() {
    let mut store = LOG_STORE.lock().unwrap();
    store.entries.clear();
}
