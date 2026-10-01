from __future__ import annotations

import os
import shutil
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import urlopen

FRONTEND_DIR = Path(__file__).resolve().parent
BACKEND_REPO_NAME = "feature-flag-platform-backend"
DEFAULT_API_BASE_URL = "http://localhost:8000/api/v1"


def run_command(command: list[str], *, cwd: Path, env: dict[str, str] | None = None) -> None:
    print(f"\n[start] {' '.join(command)}", flush=True)
    subprocess.run(command, cwd=cwd, env=env, check=True)


def read_env_value(name: str) -> str | None:
    for filename in (".env.local", ".env", ".env.example"):
        path = FRONTEND_DIR / filename
        if not path.is_file():
            continue
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            if key.strip() != name:
                continue
            value = value.strip().strip("\"'")
            return value
    return None


def api_base_url() -> str:
    return (
        os.environ.get("NEXT_PUBLIC_API_BASE_URL")
        or read_env_value("NEXT_PUBLIC_API_BASE_URL")
        or DEFAULT_API_BASE_URL
    )


def find_backend_dir() -> Path | None:
    candidates: list[Path] = []
    configured = os.environ.get("FEATURE_FLAG_BACKEND_DIR")
    if configured:
        candidates.append(Path(configured).expanduser().resolve())

    candidates.extend(
        [
            FRONTEND_DIR.parent / BACKEND_REPO_NAME,
            Path.cwd() / BACKEND_REPO_NAME,
            Path.cwd().parent / BACKEND_REPO_NAME,
        ]
    )

    seen: set[Path] = set()
    for candidate in candidates:
        candidate = candidate.resolve()
        if candidate in seen:
            continue
        seen.add(candidate)
        if (candidate / "docker-compose.yml").is_file():
            return candidate
    return None


def docker_compose() -> list[str]:
    docker = shutil.which("docker")
    if not docker:
        raise RuntimeError(
            "Docker is required by run.py to start PostgreSQL and the backend automatically."
        )
    result = subprocess.run(
        [docker, "compose", "version"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError("The Docker Compose plugin is required ('docker compose').")
    return [docker, "compose"]


def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.2)
        return sock.connect_ex(("127.0.0.1", port)) == 0


def wait_for_http(url: str, timeout: float = 60.0) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with urlopen(url, timeout=2) as response:
                if 200 <= response.status < 500:
                    return True
        except Exception:
            pass
        time.sleep(1)
    return False


def terminate_process(process: subprocess.Popen[object]) -> None:
    if process.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(process.pid), "/T", "/F"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
    else:
        try:
            os.killpg(os.getpgid(process.pid), signal.SIGTERM)
        except ProcessLookupError:
            pass
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait()


def main() -> int:
    try:
        frontend_port = int(os.environ.get("PORT", "3000"))
    except ValueError as exc:
        raise RuntimeError("PORT must be a valid integer.") from exc

    backend_dir = find_backend_dir()
    if backend_dir is None:
        raise RuntimeError(
            "Backend repository not found. Put it next to the frontend repository or set "
            "FEATURE_FLAG_BACKEND_DIR to its path."
        )

    compose = docker_compose()
    base_url = api_base_url().rstrip("/")
    parsed = urlparse(base_url)
    backend_health_url = f"{base_url}/health"
    backend_port = parsed.port or (443 if parsed.scheme == "https" else 80)

    if backend_port <= 0:
        raise RuntimeError(f"Could not determine a valid backend port from {base_url}")

    backend_started_here = False
    frontend_process: subprocess.Popen[object] | None = None

    def cleanup() -> None:
        nonlocal frontend_process
        if frontend_process is not None:
            terminate_process(frontend_process)
            frontend_process = None
        if backend_started_here:
            print("\n[stop] backend + database", flush=True)
            subprocess.run(
                [*compose, "down"],
                cwd=backend_dir,
                stdout=None,
                stderr=None,
                check=False,
            )

    try:
        if not wait_for_http(backend_health_url, timeout=2):
            print(f"[start] backend stack in {backend_dir}", flush=True)
            env = os.environ.copy()
            env["BACKEND_PORT"] = str(backend_port)
            subprocess.run(
                [*compose, "up", "--build", "-d"],
                cwd=backend_dir,
                env=env,
                check=True,
            )
            backend_started_here = True
            print(f"[wait] backend health: {backend_health_url}", flush=True)
            if not wait_for_http(backend_health_url, timeout=90):
                raise RuntimeError("Backend did not become healthy within 90 seconds.")
        else:
            print(f"[reuse] backend already healthy at {backend_health_url}", flush=True)

        if is_port_in_use(frontend_port):
            if wait_for_http(f"http://127.0.0.1:{frontend_port}", timeout=1):
                print(
                    f"[reuse] frontend already responding on http://localhost:{frontend_port}",
                    flush=True,
                )
            else:
                raise RuntimeError(
                    f"Port {frontend_port} is already in use, so the frontend cannot start "
                    "without changing its configured port."
                )
        else:
            npm = "npm.cmd" if os.name == "nt" else "npm"
            if not shutil.which(npm):
                raise RuntimeError("npm is required to start the Next.js frontend.")
            if not (FRONTEND_DIR / "node_modules" / "next").exists():
                run_command([npm, "install"], cwd=FRONTEND_DIR)

            env = os.environ.copy()
            env["NEXT_PUBLIC_API_BASE_URL"] = base_url
            print(f"[start] frontend with NEXT_PUBLIC_API_BASE_URL={base_url}", flush=True)
            popen_kwargs: dict[str, object] = {
                "cwd": str(FRONTEND_DIR),
                "env": env,
                "stdin": None,
                "stdout": None,
                "stderr": None,
            }
            if os.name == "nt":
                popen_kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
            else:
                popen_kwargs["start_new_session"] = True
            frontend_process = subprocess.Popen([npm, "run", "dev"], **popen_kwargs)

            if not wait_for_http(
                f"http://127.0.0.1:{frontend_port}", timeout=60
            ):
                raise RuntimeError(
                    f"Frontend did not become available on port {frontend_port} within 60 seconds."
                )
            print(f"\nready: http://localhost:{frontend_port}", flush=True)

        while True:
            if frontend_process is not None:
                code = frontend_process.poll()
                if code is not None:
                    return int(code)
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[stop] received Ctrl+C", flush=True)
        return 0
    finally:
        cleanup()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as exc:
        raise SystemExit(exc.returncode) from exc
    except RuntimeError as exc:
        print(f"\nerror: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
