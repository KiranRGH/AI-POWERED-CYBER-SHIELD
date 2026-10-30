import os
import sys
import subprocess
import threading
import signal
import time
import webbrowser

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

# Resolve python interpreter
venv_python = os.path.join(BACKEND_DIR, "venv", "Scripts", "python.exe")
if not os.path.exists(venv_python):
    venv_python = sys.executable

def stream_logs(pipe, prefix, color_code):
    try:
        for line in iter(pipe.readline, ""):
            if not line:
                break
            print(f"\033[{color_code}m{prefix}\033[0m {line.rstrip()}")
    except Exception:
        pass
    finally:
        try:
            pipe.close()
        except Exception:
            pass

def main():
    print("=" * 65)
    print("  CYBERSHIELD AI - LAUNCHING FRONTEND & BACKEND SIMULTANEOUSLY")
    print("=" * 65)
    print(f"[*] Root Directory: {ROOT_DIR}")
    print(f"[*] Python Runtime: {venv_python}")
    print("=" * 65)

    backend_cmd = [
        venv_python, "-m", "uvicorn", "app.main:app",
        "--host", "0.0.0.0",
        "--port", "8000",
        "--reload"
    ]

    frontend_cmd = "npm run dev -- --host 0.0.0.0 --port 3000"

    print("\n[+] Starting FastAPI Backend (http://localhost:8000)...")
    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=BACKEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    print("[+] Starting Vite Frontend (http://localhost:3000)...")
    frontend_proc = subprocess.Popen(
        frontend_cmd,
        cwd=FRONTEND_DIR,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # Stream both processes with color tags
    # 36m = Cyan for Backend, 32m = Green for Frontend
    t_backend = threading.Thread(
        target=stream_logs,
        args=(backend_proc.stdout, "[BACKEND]", "36"),
        daemon=True
    )
    t_frontend = threading.Thread(
        target=stream_logs,
        args=(frontend_proc.stdout, "[FRONTEND]", "32"),
        daemon=True
    )

    t_backend.start()
    t_frontend.start()

    print("\n" + "=" * 65)
    print("  [OK] BOTH SERVICES RUNNING CONCURRENTLY")
    print("  - Frontend: http://localhost:3000")
    print("  - Backend:  http://localhost:8000 (Docs: http://localhost:8000/docs)")
    print("  - Press Ctrl+C at any time to terminate both services cleanly.")
    print("=" * 65 + "\n")

    # Open browser after 2 seconds
    def open_browser():
        time.sleep(2.5)
        try:
            webbrowser.open("http://localhost:3000")
        except Exception:
            pass

    threading.Thread(target=open_browser, daemon=True).start()

    def shutdown(sig, frame):
        print("\n[*] Shutting down CyberShield AI services...")
        try:
            if backend_proc.poll() is None:
                backend_proc.terminate()
        except Exception:
            pass
        try:
            if frontend_proc.poll() is None:
                frontend_proc.terminate()
        except Exception:
            pass
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        while True:
            # Check if any process terminated unexpectedly
            b_poll = backend_proc.poll()
            f_poll = frontend_proc.poll()
            if b_poll is not None:
                print(f"[!] Backend stopped with code {b_poll}")
                break
            if f_poll is not None:
                print(f"[!] Frontend stopped with code {f_poll}")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        shutdown(None, None)

if __name__ == "__main__":
    main()
