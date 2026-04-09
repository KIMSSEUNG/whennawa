import json
import re
import smtplib
import subprocess
import sys
import urllib.parse
import urllib.request
from email.mime.text import MIMEText
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path


ENV_PATH = Path("/opt/whennawa-monitoring/.env")
PROM_URL = "http://127.0.0.1:9090/api/v1/query"
HOST = "0.0.0.0"
PORT = 18080


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


ENV = read_env(ENV_PATH)


def fetch_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def prom_query(expr: str) -> list[dict]:
    qs = urllib.parse.urlencode({"query": expr})
    payload = fetch_json(f"{PROM_URL}?{qs}")
    return payload.get("data", {}).get("result", [])


def bytes_per_second_to_human(value: float) -> str:
    units = ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"]
    size = value
    for unit in units:
        if size < 1024 or unit == units[-1]:
            return f"{size:.2f} {unit}"
        size /= 1024
    return f"{value:.2f} B/s"


def docker_name_map() -> dict:
    try:
        result = subprocess.run(
            ["docker", "ps", "--format", "{{.ID}} {{.Names}}"],
            capture_output=True,
            text=True,
            check=True,
        )
    except Exception:
        return {}

    mapping = {}
    for line in result.stdout.splitlines():
        parts = line.strip().split(maxsplit=1)
        if len(parts) != 2:
            continue
        cid, name = parts
        mapping[cid] = name
    return mapping


def docker_scope_to_name(scope_id: str) -> str:
    match = re.search(r"docker-([0-9a-f]{12,64})\.scope", scope_id)
    if not match:
        return scope_id
    full_id = match.group(1)
    names = docker_name_map()
    for cid, name in names.items():
        if full_id.startswith(cid) or cid.startswith(full_id[:12]):
            return name
    return scope_id


def top_latency_urls(limit: int = 3) -> list[tuple[str, float]]:
    result = prom_query(
        f'topk({limit}, histogram_quantile(0.95, '
        'sum by (le, uri) (rate(http_server_requests_seconds_bucket{job="backend-actuator",uri!="UNKNOWN",uri!="/actuator/prometheus"}[5m]))))'
    )
    rows = []
    for item in result:
        rows.append((item.get("metric", {}).get("uri", "unknown"), float(item["value"][1])))
    return rows


def top_request_urls(limit: int = 3) -> list[tuple[str, float]]:
    result = prom_query(
        f'topk({limit}, sum by (uri) (rate(http_server_requests_seconds_count{{job="backend-actuator",uri!="UNKNOWN",uri!="/actuator/prometheus"}}[5m])))'
    )
    rows = []
    for item in result:
        rows.append((item.get("metric", {}).get("uri", "unknown"), float(item["value"][1])))
    return rows


def top_error_urls(limit: int = 3) -> list[tuple[str, float]]:
    result = prom_query(
        f'topk({limit}, sum by (uri) (increase(http_server_requests_seconds_count{{job="backend-actuator",status=~"5..",uri!="UNKNOWN",uri!="/actuator/prometheus"}}[6h])))'
    )
    rows = []
    for item in result:
        rows.append((item.get("metric", {}).get("uri", "unknown"), float(item["value"][1])))
    return rows


def current_host_cpu() -> float:
    result = prom_query('100 - (avg(rate(node_cpu_seconds_total{job="node-exporter",mode="idle"}[5m])) * 100)')
    return float(result[0]["value"][1]) if result else 0.0


def current_host_mem() -> float:
    result = prom_query('(1 - (node_memory_MemAvailable_bytes{job="node-exporter"} / node_memory_MemTotal_bytes{job="node-exporter"})) * 100')
    return float(result[0]["value"][1]) if result else 0.0


def current_host_bandwidth() -> tuple[float, float]:
    amount = prom_query(
        '(sum(rate(node_network_receive_bytes_total{job="node-exporter",device!~"lo|docker.*|veth.*"}[5m])) + '
        'sum(rate(node_network_transmit_bytes_total{job="node-exporter",device!~"lo|docker.*|veth.*"}[5m])))'
    )
    percent = prom_query(
        '((sum(rate(node_network_receive_bytes_total{job="node-exporter",device!~"lo|docker.*|veth.*"}[5m])) + '
        'sum(rate(node_network_transmit_bytes_total{job="node-exporter",device!~"lo|docker.*|veth.*"}[5m]))) / '
        'sum(node_network_speed_bytes{job="node-exporter",device!~"lo|docker.*|veth.*"} > 0)) * 100'
    )
    return (
        float(amount[0]["value"][1]) if amount else 0.0,
        float(percent[0]["value"][1]) if percent else 0.0,
    )


def all_container_cpu(limit: int | None = None) -> list[tuple[str, float]]:
    result = prom_query(
        '(sum by (id) (rate(container_cpu_usage_seconds_total{job="cadvisor",id=~"/system.slice/docker-.*\\\\.scope"}[5m])) / '
        'scalar(count(count(node_cpu_seconds_total{job="node-exporter",mode="idle"}) by (cpu)))) * 100'
    )
    rows = []
    for item in result:
        scope_id = item.get("metric", {}).get("id", "unknown")
        rows.append((docker_scope_to_name(scope_id), float(item["value"][1])))
    rows.sort(key=lambda row: row[1], reverse=True)
    if limit is not None:
        return rows[:limit]
    return rows


def recent_5xx_total() -> float:
    result = prom_query(
        'sum(increase(http_server_requests_seconds_count{job="backend-actuator",status=~"5..",uri!="UNKNOWN",uri!="/actuator/prometheus"}[6h]))'
    )
    return float(result[0]["value"][1]) if result else 0.0


def format_top_rows(title: str, rows: list[tuple[str, float]], formatter) -> list[str]:
    lines = [title]
    if not rows:
        lines.append("- none")
        return lines
    for name, value in rows:
        lines.append(f"- {name}: {formatter(value)}")
    return lines


def build_host_section(alertname: str) -> list[str]:
    lines = []
    if "CPU" in alertname:
        lines.append(f"- Current host CPU usage: {current_host_cpu():.2f}%")
    elif "memory" in alertname.lower() or "메모리" in alertname:
        lines.append(f"- Current host memory usage: {current_host_mem():.2f}%")
    elif "bandwidth" in alertname.lower() or "대역폭" in alertname:
        bw, pct = current_host_bandwidth()
        lines.append(f"- Current host bandwidth: {bytes_per_second_to_human(bw)}")
        lines.append(f"- Current host bandwidth usage: {pct:.2f}%")

    lines.extend(format_top_rows("[Top latency URLs]", top_latency_urls(), lambda value: f"{value * 1000:.2f} ms"))
    lines.extend(format_top_rows("[Top request URLs]", top_request_urls(), lambda value: f"{value:.3f} req/s"))
    lines.append("[Top container CPU]")
    container_rows = all_container_cpu(limit=3)
    if not container_rows:
        lines.append("- none")
    else:
        for name, value in container_rows:
            lines.append(f"- {name}: {value:.2f}%")
    return lines


def build_5xx_section() -> list[str]:
    lines = [f"- Total 5xx in last 6h: {recent_5xx_total():.0f}"]
    lines.extend(format_top_rows("[Top 5xx URLs]", top_error_urls(), lambda value: f"{value:.0f}"))
    lines.extend(format_top_rows("[Top latency URLs]", top_latency_urls(), lambda value: f"{value * 1000:.2f} ms"))
    return lines


def build_container_section(labels: dict) -> list[str]:
    scope_id = labels.get("id", "")
    name = docker_scope_to_name(scope_id) if scope_id else "unknown"
    current_value = labels.get("current_value", "")
    lines = [f"- Target container: {name}"]
    if current_value:
        lines.append(f"- Current CPU usage: {current_value}")
    return lines


def build_email_body(payload: dict, alert: dict) -> tuple[str, str]:
    title = payload.get("title") or payload.get("commonLabels", {}).get("alertname") or "WhenNawa alert"
    state = payload.get("status", "unknown")
    labels = alert.get("labels", {})
    annotations = alert.get("annotations", {})
    alertname = labels.get("alertname") or title

    lines = [
        f"Title: {title}",
        f"Status: {state}",
        "",
        f"[{alertname}]",
    ]

    if annotations.get("summary"):
        lines.append(f"- Summary: {annotations['summary']}")
    if alert.get("startsAt"):
        lines.append(f"- Starts at: {alert['startsAt']}")
    generator = alert.get("generatorURL")
    if generator:
        lines.append(f"- Source: {generator}")

    if "CPU" in alertname or "memory" in alertname.lower() or "메모리" in alertname or "bandwidth" in alertname.lower() or "대역폭" in alertname:
        lines.extend(build_host_section(alertname))
    elif "5xx" in alertname:
        lines.extend(build_5xx_section())
    elif "container" in alertname.lower() or "컨테이너" in alertname:
        current_value = annotations.get("__values__", "")
        if current_value:
            try:
                parsed = json.loads(current_value)
                labels["current_value"] = f"{float(parsed.get('A', 0.0)):.2f}%"
            except Exception:
                pass
        lines.extend(build_container_section(labels))

    lines.append("")
    return alertname, "\n".join(lines).strip()


def build_email_messages(payload: dict) -> list[tuple[str, str]]:
    alerts = payload.get("alerts", [])
    if not alerts:
        title = payload.get("title") or payload.get("commonLabels", {}).get("alertname") or "WhenNawa alert"
        state = payload.get("status", "unknown")
        return [(title, "\n".join([f"Title: {title}", f"Status: {state}"]))]
    return [build_email_body(payload, alert) for alert in alerts]


def send_mail(subject: str, body: str) -> None:
    user = ENV["GF_SMTP_USER"]
    password = ENV["GF_SMTP_PASSWORD"]
    host = ENV.get("GF_SMTP_HOST", "smtp.gmail.com:587")
    from_address = ENV.get("GF_SMTP_FROM_ADDRESS", user)
    from_name = ENV.get("GF_SMTP_FROM_NAME", "WhenNawa Monitoring")
    to_address = from_address
    smtp_host, smtp_port = host.split(":")

    msg = MIMEText(body, _subtype="plain", _charset="utf-8")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{from_address}>"
    msg["To"] = to_address

    with smtplib.SMTP(smtp_host, int(smtp_port), timeout=20) as server:
        server.starttls()
        server.login(user, password)
        server.sendmail(from_address, [to_address], msg.as_string())


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/grafana-alert":
            self.send_response(404)
            self.end_headers()
            return

        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw.decode("utf-8-sig"))
            for subject, body in build_email_messages(payload):
                send_mail(subject, body)
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"ok")
        except Exception as exc:
            print(f"alert webhook error: {exc}", file=sys.stderr, flush=True)
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(exc).encode("utf-8", "ignore"))

    def log_message(self, format, *args):
        print(format % args, flush=True)


def main():
    server = HTTPServer((HOST, PORT), Handler)
    print(f"alert webhook server listening on {HOST}:{PORT}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
