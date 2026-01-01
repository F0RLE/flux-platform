use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct SystemStats {
    pub cpu: CpuStats,
    pub ram: RamStats,
    pub disk: DiskStats,
    pub network: NetworkStats,
    pub pid: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct CpuStats {
    pub percent: f32,
    pub cores: usize,
    pub name: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct RamStats {
    pub percent: f32,
    pub used_gb: f32,
    pub total_gb: f32,
    pub available_gb: f32,
}

#[derive(Debug, Clone, Serialize)]
pub struct DiskStats {
    pub read_rate: f64,
    pub write_rate: f64,
    pub utilization: f32,
    pub total_gb: f32,
    pub used_gb: f32,
}

#[derive(Debug, Clone, Serialize)]
pub struct NetworkStats {
    pub download_rate: f64,
    pub upload_rate: f64,
    pub total_received: u64,
    pub total_sent: u64,
    pub utilization: f32,
}
