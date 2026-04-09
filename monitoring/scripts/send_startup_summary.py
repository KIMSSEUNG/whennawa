import json
import os
import smtplib
import sys
import time
import urllib.parse
import urllib.request
from email.mime.text import MIMEText
from pathlib import Path


ENV_PATH = Path("/opt/whennawa-monitoring/.env")
PROM_URL = "http://127.0.0.1:9090/api/v1/query"
TARGETS_URL = "http://127.0.0.1:9090/api/v1/targets"


def read_env(path: Path) -> dict:
    data = {}
    if not path.exists():
        return data
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        data[key.strip()] = value.strip()
    return data


def fetch_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def prom_query(expr: str) -> float:
    qs = urllib.parse.urlencode({"query": expr})
    payload = fetch_json(f"{PROM_URL}?{qs}")
    result = payload.get("data", {}).get("result", [])
    if not result:
        return 0.0
    return float(result[0]["value"][1])


def prom_vector(expr: str) -> list[tuple[str, float]]:
    qs = urllib.parse.urlencode({"query": expr})
    payload = fetch_json(f"{PROM_URL}?{qs}")
    result = payload.get("data", {}).get("result", [])
    rows = []
    for item in result:
        metric = item.get("metric", {})
        name = metric.get("name") or metric.get("instance") or metric.get("device") or "unknown"
        rows.append((name, float(item["value"][1])))
    return rows


def bytes_to_human(value: float) -> str:
    units = ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"]
    size = value
    for unit in units:
        if size < 1024 or unit == units[-1]:
            return f"{size:.2f} {unit}"
        size /= 1024
    return f"{value:.2f} B/s"


def wait_for_prometheus(max_wait: int = 60) -> None:
    deadline = time.time() + max_wait
    while time.time() < deadline:
        try:
            data = fetch_json(TARGETS_URL)
            if data.get("status") == "success":
                return
        except Exception:
            pass
        time.sleep(3)
    raise RuntimeError("Prometheus is not ready")


def build_body() -> str:
    host_cpu = prom_query('100 - (avg(rate(node_cpu_seconds_total{job="node-exporter",mode="idle"}[5m])) * 100)')
    host_mem = prom_query('(1 - (node_memory_MemAvailable_bytes{job="node-exporter"} / node_memory_MemTotal_bytes{job="node-exporter"})) * 100')
    host_bw = prom_query('(sum(rate(node_network_receive_bytes_total{job="node-exporter",device!~"lo|docker.*|veth.*"}[5m])) + sum(rate(node_network_transmit_bytes_total{job="node-exporter",device!~"lo|docker.*|veth.*"}[5m])))')
    host_bw_pct = prom_query('((sum(rate(node_network_receive_bytes_total{job="node-exporter",device!~"lo|docker.*|veth.*"}[5m])) + sum(rate(node_network_transmit_bytes_total{job="node-exporter",device!~"lo|docker.*|veth.*"}[5m]))) / sum(node_network_speed_bytes{job="node-exporter",device!~"lo|docker.*|veth.*"} > 0)) * 100')
    host_mem_total = prom_query('sum(node_memory_MemTotal_bytes{job="node-exporter"})')

    container_cpu = prom_vector('(sum by (name) (rate(container_cpu_usage_seconds_total{job="cadvisor",name=~"whennawa-.*"}[5m])) / scalar(count(count(node_cpu_seconds_total{job="node-exporter",mode="idle"}) by (cpu)))) * 100')
    container_mem = prom_vector('sum by (name) (container_memory_usage_bytes{job="cadvisor",name=~"whennawa-.*"})')
    targets = fetch_json(TARGETS_URL).get("data", {}).get("activeTargets", [])

    lines = [
        "언제나와 모니터링 시작 요약",
        "",
        "[호스트 요약]",
        f"- CPU 사용률: {host_cpu:.2f}%",
        f"- 메모리 사용률: {host_mem:.2f}%",
        f"- 대역폭 사용량: {bytes_to_human(host_bw)}",
        f"- 대역폭 사용률: {host_bw_pct:.2f}%",
        "",
        "[컨테이너 요약]",
    ]

    mem_map = {name: value for name, value in container_mem}
    for name, cpu in container_cpu:
        mem_bytes = mem_map.get(name, 0.0)
        mem_pct = (mem_bytes / host_mem_total * 100) if host_mem_total else 0.0
        lines.append(f"- {name}: CPU {cpu:.2f}%, 메모리 {mem_pct:.2f}% ({mem_bytes / 1024 / 1024:.2f} MiB)")

    lines.extend(["", "[타깃 상태]"])
    for target in targets:
        labels = target.get("labels", {})
        lines.append(f"- {labels.get('job', 'unknown')}: {target.get('health', 'unknown')}")

    lines.extend(
        [
            "",
            "[접속 주소]",
            "- Grafana: http://3.36.87.146:3001",
            "- Prometheus: http://3.36.87.146:9090",
            "",
            "이 메일은 모니터링 스택 시작 직후 자동 발송되었습니다.",
        ]
    )
    return "\n".join(lines)


def send_mail(env: dict, body: str) -> None:
    user = env["GF_SMTP_USER"]
    password = env["GF_SMTP_PASSWORD"]
    host = env.get("GF_SMTP_HOST", "smtp.gmail.com:587")
    from_address = env.get("GF_SMTP_FROM_ADDRESS", user)
    from_name = env.get("GF_SMTP_FROM_NAME", "WhenNawa Monitoring")
    to_address = from_address
    smtp_host, smtp_port = host.split(":")

    msg = MIMEText(body, _subtype="plain", _charset="utf-8")
    msg["Subject"] = "언제나와 모니터링 시작 요약"
    msg["From"] = f"{from_name} <{from_address}>"
    msg["To"] = to_address

    with smtplib.SMTP(smtp_host, int(smtp_port), timeout=20) as server:
        server.starttls()
        server.login(user, password)
        server.sendmail(from_address, [to_address], msg.as_string())


def main() -> int:
    env = read_env(ENV_PATH)
    required = ["GF_SMTP_USER", "GF_SMTP_PASSWORD"]
    missing = [key for key in required if not env.get(key)]
    if missing:
        print(f"Missing SMTP settings: {', '.join(missing)}", file=sys.stderr)
        return 1

    wait_for_prometheus()
    body = build_body()
    send_mail(env, body)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
