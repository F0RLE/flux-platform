"""
Minimal HTTP server for Electron frontend.
Serves static files and provides API endpoints.
"""
import os
import sys
import json
import threading
import psutil
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

from backend.config.paths import PROJECT_ROOT

PORT = 18888
_server = None
_server_thread = None

# Locales directory
_locales_dir = os.path.join(PROJECT_ROOT, "src", "backend", "i18n", "locales")

# I/O tracking for rate calculation
import time
import subprocess
_last_io_time = 0
_last_disk_read = 0
_last_disk_write = 0
_last_net_recv = 0
_last_net_sent = 0
_disk_read_rate = 0
_disk_write_rate = 0
_net_recv_rate = 0
_net_sent_rate = 0

# GPU info cache (refresh every 2 seconds)
_gpu_info_cache = None
_gpu_info_last_update = 0
_GPU_CACHE_TTL = 2.0

# Log storage for console
_logs = []
_logs_lock = threading.Lock()
_MAX_LOGS = 500

# Test download state
_test_download_state = {
    "active": False,
    "percent": 0,
    "downloaded": 0,
    "total": 10 * 1024 * 1024 * 1024,  # 10 GB
    "speed": 0,
    "label": "test_cache_data.bin",
    "completed": False,
    "error": None
}
_test_download_thread = None
_test_download_stop = False
_test_download_file = None


def add_log(message, source="SYSTEM", level="info"):
    """Add a log entry for frontend console."""
    with _logs_lock:
        _logs.append({
            "timestamp": time.time(),
            "source": source,
            "level": level,
            "message": message
        })
        # Trim old logs
        if len(_logs) > _MAX_LOGS:
            _logs[:] = _logs[-_MAX_LOGS:]


def get_logs_since(since=0):
    """Get logs since timestamp."""
    with _logs_lock:
        return [log for log in _logs if log["timestamp"] > since]


def clear_logs():
    """Clear all logs."""
    with _logs_lock:
        _logs.clear()


def _get_gpu_info():
    """Get GPU info using nvidia-smi."""
    global _gpu_info_cache, _gpu_info_last_update
    
    current_time = time.time()
    if _gpu_info_cache is not None and (current_time - _gpu_info_last_update) < _GPU_CACHE_TTL:
        return _gpu_info_cache
    
    try:
        result = subprocess.run(
            ['nvidia-smi', '--query-gpu=name,utilization.gpu,memory.used,memory.total', '--format=csv,noheader,nounits'],
            capture_output=True, text=True, timeout=2,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
        )
        
        if result.returncode == 0 and result.stdout.strip():
            parts = result.stdout.strip().split(',')
            if len(parts) >= 4:
                name = parts[0].strip()
                util = float(parts[1].strip())
                mem_used = float(parts[2].strip()) / 1024  # MB to GB
                mem_total = float(parts[3].strip()) / 1024  # MB to GB
                mem_percent = (mem_used / mem_total * 100) if mem_total > 0 else 0
                
                _gpu_info_cache = {
                    "detected": True,
                    "name": name,
                    "utilization": util,
                    "memory_percent": mem_percent,
                    "memory_used_gb": round(mem_used, 1),
                    "memory_total_gb": round(mem_total, 1)
                }
                _gpu_info_last_update = current_time
                return _gpu_info_cache
    except Exception:
        pass
    
    # No GPU detected
    _gpu_info_cache = {
        "detected": False,
        "name": "N/A",
        "utilization": 0,
        "memory_percent": 0,
        "memory_used_gb": 0,
        "memory_total_gb": 0
    }
    _gpu_info_last_update = current_time
    return _gpu_info_cache


class LauncherHandler(SimpleHTTPRequestHandler):
    """Handler for launcher HTTP requests."""
    
    def __init__(self, *args, **kwargs):
        self.web_dir = os.path.join(PROJECT_ROOT, "src", "frontend", "web")
        super().__init__(*args, directory=self.web_dir, **kwargs)
    
    def log_message(self, format, *args):
        pass
    
    def end_headers(self):
        """Add no-cache headers for static files."""
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def do_GET(self):
        """Handle GET requests."""
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)
        
        # === API Endpoints ===
        
        if path == "/api/health":
            return self._send_json({"status": "ok"})
        
        if path == "/api/translations":
            lang = query.get("lang", ["en"])[0]
            return self._serve_translations(lang)
        
        if path == "/api/system_language":
            return self._send_json({"language": "ru"})
        
        if path == "/api/settings":
            return self._send_json({
                "theme": "dark",
                "language": "ru",
                "use_gpu": True,
                "debug_mode": False
            })
        
        if path == "/api/state":
            return self._send_json({
                "services": {},
                "status": "idle"
            })
        
        if path == "/api/system_stats":
            return self._send_json(self._get_system_stats())
        
        if path == "/api/gpu_info":
            return self._send_json({"gpu": "N/A", "vram_total": 0, "vram_used": 0})
        
        if path == "/api/check_sd_installed":
            return self._send_json({"installed": False})
        
        if path == "/api/logs":
            since = float(query.get("since", ["0"])[0])
            return self._send_json(get_logs_since(since))
        
        if path == "/api/logs/clear":
            clear_logs()
            return self._send_json({"status": "ok"})
        
        if path == "/api/download_progress":
            return self._send_json({"percent": 0, "downloaded": 0, "total": 0, "speed": 0, "completed": False})
        
        if path.startswith("/api/control"):
            action = query.get("action", [""])[0]
            service = query.get("service", [""])[0]
            
            if action == "stop" and service == "all":
                self._send_json({"status": "stopping"})
                threading.Thread(target=self._delayed_shutdown, daemon=True).start()
                return
            
            return self._send_json({"status": "ok", "action": action})

        if path == "/api/modules":
            return self._send_json([])

        if path == "/api/llm_models":
            return self._send_json([])

        if path == "/api/sd_models":
            return self._send_json([])

        
        # Serve locales directly
        if path.startswith("/locales/"):
            locale_file = os.path.join(_locales_dir, os.path.basename(path))
            if os.path.exists(locale_file):
                with open(locale_file, 'r', encoding='utf-8') as f:
                    return self._send_json(json.load(f))
        
        # Root -> index.html
        if path == "/" or path == "":
            self.path = "/index.html"
        
        try:
            return super().do_GET()
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            pass
    
    def do_POST(self):
        """Handle POST requests."""
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)
        
        if path == "/api/transcribe":
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                print(f"[DEBUG] Transcribe request: {content_len} bytes")
                audio_data = self.rfile.read(content_len)
                
                # We expect WAV data from frontend
                import tempfile
                import speech_recognition as sr
                import os
                
                # Create temp file
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                    tmp.write(audio_data)
                    tmp_path = tmp.name
                
                try:
                    r = sr.Recognizer()
                    with sr.AudioFile(tmp_path) as source:
                        audio = r.record(source)
                    
                    lang = query.get("lang", ["en-US"])[0]
                    print(f"[DEBUG] Audio duration: {source.DURATION}")
                    text = r.recognize_google(audio, language=lang)
                    print(f"[DEBUG] Recognized text: '{text}'")
                    
                    try:
                        os.remove(tmp_path)
                    except:
                        pass
                        
                    return self._send_json({"text": text})
                except sr.UnknownValueError:
                     print("[DEBUG] UnknownValueError: Could not understand audio")
                     try: os.remove(tmp_path)
                     except: pass
                     return self._send_json({"text": ""}) # No speech detected
                except sr.RequestError as e:
                     print(f"[DEBUG] RequestError: {e}")
                     try: os.remove(tmp_path)
                     except: pass
                     return self._send_json({"error": f"API Error: {e}"}, status=500)
                except Exception as e:
                     try: os.remove(tmp_path)
                     except: pass
                     print(f"[DEBUG] Valid Error: {e}")
                     return self._send_json({"error": str(e)}, status=500)

            except Exception as e:
                return self._send_json({"error": str(e)}, status=500)
        
        if path == "/api/log":
            return self._send_json({"status": "ok"})
        
        if path == "/api/logs/clear":
            clear_logs()
            return self._send_json({"status": "ok"})
        
        if path == "/api/settings":
            return self._send_json({"status": "saved"})

        if path == "/api/delete_sd_model":
            return self._send_json({"status": "ok"})

        
        self._send_json({"status": "ok"})
    
    def _serve_translations(self, lang):
        """Serve translation file."""
        locale_file = os.path.join(_locales_dir, f"{lang}.json")
        if os.path.exists(locale_file):
            try:
                with open(locale_file, 'r', encoding='utf-8') as f:
                    return self._send_json(json.load(f))
            except Exception:
                pass
        return self._send_json({})
    
    def _get_system_stats(self):
        """Get system stats in format expected by frontend."""
        global _last_io_time, _last_disk_read, _last_disk_write
        global _last_net_recv, _last_net_sent
        global _disk_read_rate, _disk_write_rate, _net_recv_rate, _net_sent_rate
        
        try:
            mem = psutil.virtual_memory()
            current_time = time.time()
            
            # Get current I/O counters
            try:
                disk_io = psutil.disk_io_counters()
                disk_read = getattr(disk_io, 'read_bytes', 0) if disk_io else 0
                disk_write = getattr(disk_io, 'write_bytes', 0) if disk_io else 0
            except Exception:
                disk_read, disk_write = 0, 0
            
            try:
                net_io = psutil.net_io_counters()
                net_recv = getattr(net_io, 'bytes_recv', 0) if net_io else 0
                net_sent = getattr(net_io, 'bytes_sent', 0) if net_io else 0
            except Exception:
                net_recv, net_sent = 0, 0
            
            # Calculate rates (bytes per second)
            if _last_io_time > 0:
                elapsed = current_time - _last_io_time
                if elapsed > 0:
                    _disk_read_rate = (disk_read - _last_disk_read) / elapsed
                    _disk_write_rate = (disk_write - _last_disk_write) / elapsed
                    _net_recv_rate = (net_recv - _last_net_recv) / elapsed
                    _net_sent_rate = (net_sent - _last_net_sent) / elapsed
                    
                    # Clamp to 0 if negative (counter reset)
                    _disk_read_rate = max(0, _disk_read_rate)
                    _disk_write_rate = max(0, _disk_write_rate)
                    _net_recv_rate = max(0, _net_recv_rate)
                    _net_sent_rate = max(0, _net_sent_rate)
            
            # Store current values for next calculation
            _last_io_time = current_time
            _last_disk_read = disk_read
            _last_disk_write = disk_write
            _last_net_recv = net_recv
            _last_net_sent = net_sent
            
            return {
                "cpu": {
                    "percent": psutil.cpu_percent(interval=0.1)
                },
                "ram": {
                    "percent": mem.percent,
                    "used_gb": round(mem.used / (1024**3), 1),
                    "total_gb": round(mem.total / (1024**3), 1)
                },
                "gpu": _get_gpu_info(),
                "network": {
                    "download_rate": _net_recv_rate,
                    "upload_rate": _net_sent_rate,
                    "utilization": 0
                },
                "disk": {
                    "read_rate": _disk_read_rate,
                    "write_rate": _disk_write_rate,
                    "utilization": 0
                },
                "pid": os.getpid()
            }
        except Exception:
            return {
                "cpu": {"percent": 0},
                "ram": {"percent": 0, "used_gb": 0, "total_gb": 0},
                "gpu": {"detected": False, "utilization": 0, "memory_percent": 0, "memory_used_gb": 0, "memory_total_gb": 0, "name": "N/A"},
                "network": {"download_rate": 0, "upload_rate": 0, "utilization": 0},
                "disk": {"read_rate": 0, "write_rate": 0, "utilization": 0},
                "pid": 0
            }
    
    def _start_test_download(self, total_size=5368709120, speed_limit=0):
        """Start a test download that writes random data to temp file."""
        global _test_download_thread, _test_download_stop, _test_download_file, _test_download_state
        
        # Stop any existing download
        if _test_download_thread and _test_download_thread.is_alive():
            _test_download_stop = True
            _test_download_thread.join(timeout=2)
        
        _test_download_stop = False
        

    
    def _send_json(self, data, status=200):
        """Send JSON response."""
        try:
            response = json.dumps(data).encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', len(response))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(response)
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            pass  # Client disconnected, ignore
    
    def _delayed_shutdown(self):
        import time
        time.sleep(0.5)
        os._exit(0)


def start_server():
    """Start the HTTP server in background thread."""
    global _server, _server_thread
    
    if _server is not None:
        return
    
    try:
        _server = HTTPServer(('127.0.0.1', PORT), LauncherHandler)
        _server_thread = threading.Thread(target=_server.serve_forever, daemon=True)
        _server_thread.start()
        print(f"[SERVER] Started on http://localhost:{PORT}")
        
        # Add startup logs for frontend console
        add_log(f"🚀 Launcher started", "Консоль", "info")
        add_log(f"📋 PID: {os.getpid()}", "Консоль", "info")
    except Exception as e:
        print(f"[SERVER] Failed to start: {e}")


def stop_server():
    """Stop the HTTP server."""
    global _server
    if _server:
        _server.shutdown()
        _server = None
        print("[SERVER] Stopped")
