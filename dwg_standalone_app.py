#!/usr/bin/env python3
"""
dwg_standalone_app.py - Standalone Desktop Launcher for DWG & CAD File Viewer
Runs the DWG Viewer web GUI and opens the dedicated CAD interface immediately.
"""

import os
import sys
import time
import socket
import threading
import webbrowser
import subprocess
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
APP_PY = os.path.join(SCRIPT_DIR, "app.py")
VENV_PYTHON = os.path.join(SCRIPT_DIR, "venv", "bin", "python3")
PYTHON_EXEC = VENV_PYTHON if os.path.exists(VENV_PYTHON) else sys.executable

PORT = 9191
VIEWER_URL = f"http://localhost:{PORT}/tools/dwg-viewer"

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(('127.0.0.1', port)) == 0

def ensure_server_running():
    """Ensure the local portfolio & tools backend is active on PORT."""
    if is_port_in_use(PORT):
        return True

    # Start server in background
    cmd = [PYTHON_EXEC, APP_PY]
    env = os.environ.copy()
    env["PORT"] = str(PORT)
    subprocess.Popen(
        cmd,
        cwd=SCRIPT_DIR,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    # Wait up to 5 seconds for port to open
    for _ in range(25):
        time.sleep(0.2)
        if is_port_in_use(PORT):
            return True
    return False

class DWGViewerDesktopApp:
    def __init__(self, root):
        self.root = root
        self.root.title("AutoCAD DWG / DXF Viewer — Desktop Suite")
        self.root.geometry("540x420")
        self.root.resizable(False, False)
        self.root.configure(bg="#0b1322")

        # Styling
        style = ttk.Style()
        style.theme_use('default')
        style.configure("TLabel", background="#0b1322", foreground="#f1f5f9")
        style.configure("TButton", font=("Helvetica", 10, "bold"), padding=8)

        # Header Title
        lbl_title = tk.Label(
            root,
            text="📐 AutoCAD DWG / DXF Viewer",
            font=("Helvetica", 18, "bold"),
            bg="#0b1322",
            fg="#38bdf8"
        )
        lbl_title.pack(pady=(24, 4))

        lbl_sub = tk.Label(
            root,
            text="Interactive Vector CAD Engine with Layers, Distance Measurement & 60 FPS Canvas",
            font=("Helvetica", 9),
            bg="#0b1322",
            fg="#94a3b8"
        )
        lbl_sub.pack(pady=(0, 20))

        # Status Frame
        status_frame = tk.Frame(root, bg="#131b2e", padx=16, pady=12, highlightbackground="#1e293b", highlightthickness=1)
        status_frame.pack(fill="x", padx=28, pady=(0, 18))

        self.lbl_server_status = tk.Label(
            status_frame,
            text="● Checking CAD Engine Status...",
            font=("Helvetica", 10, "bold"),
            bg="#131b2e",
            fg="#f59e0b"
        )
        self.lbl_server_status.pack(anchor="w")

        lbl_port = tk.Label(
            status_frame,
            text=f"Target URL: {VIEWER_URL}",
            font=("Courier", 9),
            bg="#131b2e",
            fg="#64748b"
        )
        lbl_port.pack(anchor="w", pady=(2, 0))

        # Buttons Frame
        btn_frame = tk.Frame(root, bg="#0b1322")
        btn_frame.pack(fill="both", expand=True, padx=28)

        self.btn_launch = tk.Button(
            btn_frame,
            text="🚀 Launch DWG File Viewer GUI",
            font=("Helvetica", 12, "bold"),
            bg="#0284c7",
            fg="#ffffff",
            activebackground="#0369a1",
            activeforeground="#ffffff",
            relief="flat",
            padx=16,
            pady=10,
            cursor="pointinghand",
            command=self.launch_viewer
        )
        self.btn_launch.pack(fill="x", pady=6)

        btn_sample = tk.Button(
            btn_frame,
            text="🏢 Open Sample Architectural Blueprint",
            font=("Helvetica", 10),
            bg="#1e293b",
            fg="#f1f5f9",
            activebackground="#334155",
            activeforeground="#ffffff",
            relief="flat",
            pady=8,
            cursor="pointinghand",
            command=self.open_sample
        )
        btn_sample.pack(fill="x", pady=4)

        btn_tools = tk.Button(
            btn_frame,
            text="⚡ Explore Full 33+ Utilities Suite",
            font=("Helvetica", 10),
            bg="#1e293b",
            fg="#f1f5f9",
            activebackground="#334155",
            activeforeground="#ffffff",
            relief="flat",
            pady=8,
            cursor="pointinghand",
            command=self.open_all_tools
        )
        btn_tools.pack(fill="x", pady=4)

        # Footer
        lbl_footer = tk.Label(
            root,
            text="FastTrack Tools Suite • www.shajjadkhan.com",
            font=("Helvetica", 8),
            bg="#0b1322",
            fg="#475569"
        )
        lbl_footer.pack(side="bottom", pady=12)

        # Check server in background thread
        threading.Thread(target=self.init_server_check, daemon=True).start()

    def init_server_check(self):
        running = ensure_server_running()
        if running:
            self.lbl_server_status.config(text="● CAD Processing Server: Active & Ready", fg="#22c55e")
        else:
            self.lbl_server_status.config(text="● CAD Processing Server: Standby (Auto-launch on demand)", fg="#94a3b8")

    def launch_viewer(self):
        self.lbl_server_status.config(text="● Launching CAD Viewer...", fg="#38bdf8")
        threading.Thread(target=self._launch_thread, daemon=True).start()

    def _launch_thread(self):
        ensure_server_running()
        webbrowser.open(VIEWER_URL)
        self.lbl_server_status.config(text="● CAD Processing Server: Active & Connected", fg="#22c55e")

    def open_sample(self):
        ensure_server_running()
        webbrowser.open(f"{VIEWER_URL}#sample-floorplan")

    def open_all_tools(self):
        ensure_server_running()
        webbrowser.open(f"http://localhost:{PORT}/tools")

if __name__ == "__main__":
    # If passed --headless or --browser-only, simply open browser directly
    if "--open-only" in sys.argv or "--browser-only" in sys.argv:
        print(f"Opening DWG Viewer at {VIEWER_URL}...")
        ensure_server_running()
        webbrowser.open(VIEWER_URL)
        sys.exit(0)

    try:
        root = tk.Tk()
        app = DWGViewerDesktopApp(root)
        root.mainloop()
    except Exception as e:
        print(f"Starting in browser mode ({e})...")
        ensure_server_running()
        webbrowser.open(VIEWER_URL)
