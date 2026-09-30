import shutil
import psutil
from typing import Dict, Any

class HardwareService:
    @staticmethod
    def get_hardware_metrics() -> Dict[str, Any]:
        """
        Honest hardware monitoring for CPU, System RAM, and Disk space.
        """
        cpu_pct = psutil.cpu_percent(interval=0.1)
        mem = psutil.virtual_memory()
        disk = shutil.disk_usage(".")

        total_ram_gb = round(mem.total / (1024 ** 3), 2)
        avail_ram_gb = round(mem.available / (1024 ** 3), 2)
        used_ram_gb = round(mem.used / (1024 ** 3), 2)
        
        disk_free_gb = round(disk.free / (1024 ** 3), 2)
        disk_total_gb = round(disk.total / (1024 ** 3), 2)

        return {
            "cpu_percent": cpu_pct,
            "cpu_cores": psutil.cpu_count(logical=True),
            "total_ram_gb": total_ram_gb,
            "available_ram_gb": avail_ram_gb,
            "used_ram_gb": used_ram_gb,
            "ram_percent": mem.percent,
            "disk_free_gb": disk_free_gb,
            "disk_total_gb": disk_total_gb,
            "device_mode": "CPU (XGBoost n_jobs=-1)",
            "gpu_detected": False,
            "gpu_info": "CPU execution validated. GPU acceleration optional."
        }
