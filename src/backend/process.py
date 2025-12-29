"""
Process management: PID tracking and Windows Job Objects.
"""
import os
import sys
import json

# PID file path
_appdata = os.environ.get("APPDATA", "")
_pids_file = os.path.join(_appdata, "FluxData", "System", "Temp", "pids.json")
_pid_file = os.path.join(_appdata, "FluxData", "System", "Temp", "launcher.pid")


def save_pid(name: str, pid: int) -> None:
    """Save a process PID to tracking file."""
    try:
        os.makedirs(os.path.dirname(_pids_file), exist_ok=True)
        
        pids = {}
        if os.path.exists(_pids_file):
            try:
                with open(_pids_file, 'r', encoding='utf-8') as f:
                    pids = json.load(f)
            except Exception:
                pass
        
        pids[name] = pid
        
        with open(_pids_file, 'w', encoding='utf-8') as f:
            json.dump(pids, f, indent=2)
    except Exception:
        pass


def register_launcher_pid() -> None:
    """Register current process as launcher."""
    try:
        os.makedirs(os.path.dirname(_pid_file), exist_ok=True)
        with open(_pid_file, 'w') as f:
            f.write(str(os.getpid()))
        save_pid("launcher", os.getpid())
    except Exception:
        pass


def cleanup_pids() -> None:
    """Remove PID files on shutdown."""
    try:
        if os.path.exists(_pid_file):
            os.remove(_pid_file)
        if os.path.exists(_pids_file):
            os.remove(_pids_file)
    except Exception:
        pass


def kill_old_processes() -> int:
    """Kill processes from previous run. Returns count killed."""
    import subprocess
    import time
    
    if not os.path.exists(_pids_file):
        return 0
    
    try:
        with open(_pids_file, 'r', encoding='utf-8') as f:
            pids = json.load(f)
        
        current_pid = os.getpid()
        killed = 0
        
        for name, pid in list(pids.items()):
            try:
                pid_int = int(pid)
                if pid_int == current_pid:
                    continue
                
                if sys.platform == "win32":
                    result = subprocess.run(
                        ["tasklist", "/FI", f"PID eq {pid_int}"],
                        capture_output=True, text=True,
                        creationflags=subprocess.CREATE_NO_WINDOW,
                        timeout=3
                    )
                    if str(pid_int) in result.stdout:
                        subprocess.run(
                            ["taskkill", "/F", "/T", "/PID", str(pid_int)],
                            capture_output=True,
                            creationflags=subprocess.CREATE_NO_WINDOW,
                            timeout=10
                        )
                        killed += 1
                else:
                    import signal
                    try:
                        os.kill(pid_int, signal.SIGTERM)
                        killed += 1
                    except (ProcessLookupError, PermissionError):
                        pass
            except Exception:
                pass
        
        if killed > 0:
            time.sleep(0.2)
        
        os.remove(_pids_file)
        return killed
    except Exception:
        return 0


# =============================================================================
# WINDOWS JOB OBJECTS
# =============================================================================

if sys.platform != "win32":
    def create_job_object():
        return None
    def assign_current_process():
        return False
else:
    import ctypes
    from ctypes import wintypes
    
    kernel32 = ctypes.windll.kernel32
    JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000
    
    class JOBOBJECT_BASIC_LIMIT_INFORMATION(ctypes.Structure):
        _fields_ = [
            ("PerProcessUserTimeLimit", wintypes.LARGE_INTEGER),
            ("PerJobUserTimeLimit", wintypes.LARGE_INTEGER),
            ("LimitFlags", wintypes.DWORD),
            ("MinimumWorkingSetSize", ctypes.c_size_t),
            ("MaximumWorkingSetSize", ctypes.c_size_t),
            ("ActiveProcessLimit", wintypes.DWORD),
            ("Affinity", ctypes.POINTER(wintypes.ULONG)),
            ("PriorityClass", wintypes.DWORD),
            ("SchedulingClass", wintypes.DWORD),
        ]
    
    class IO_COUNTERS(ctypes.Structure):
        _fields_ = [
            ("ReadOperationCount", ctypes.c_ulonglong),
            ("WriteOperationCount", ctypes.c_ulonglong),
            ("OtherOperationCount", ctypes.c_ulonglong),
            ("ReadTransferCount", ctypes.c_ulonglong),
            ("WriteTransferCount", ctypes.c_ulonglong),
            ("OtherTransferCount", ctypes.c_ulonglong),
        ]
    
    class JOBOBJECT_EXTENDED_LIMIT_INFORMATION(ctypes.Structure):
        _fields_ = [
            ("BasicLimitInformation", JOBOBJECT_BASIC_LIMIT_INFORMATION),
            ("IoInfo", IO_COUNTERS),
            ("ProcessMemoryLimit", ctypes.c_size_t),
            ("JobMemoryLimit", ctypes.c_size_t),
            ("PeakProcessMemoryUsed", ctypes.c_size_t),
            ("PeakJobMemoryUsed", ctypes.c_size_t),
        ]
    
    _job_handle = None
    
    def create_job_object():
        """Create Windows Job Object for process group termination."""
        global _job_handle
        if _job_handle is not None:
            return _job_handle
        
        try:
            job = kernel32.CreateJobObjectW(None, None)
            if not job:
                return None
            
            info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION()
            info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
            
            result = kernel32.SetInformationJobObject(
                job, 9, ctypes.byref(info), ctypes.sizeof(info)
            )
            
            if not result:
                kernel32.CloseHandle(job)
                return None
            
            _job_handle = job
            return job
        except Exception:
            return None
    
    def assign_current_process():
        """Assign current process to job object."""
        global _job_handle
        if _job_handle is None:
            create_job_object()
        if _job_handle is None:
            return False
        
        try:
            current = kernel32.GetCurrentProcess()
            return bool(kernel32.AssignProcessToJobObject(_job_handle, current))
        except Exception:
            return False
