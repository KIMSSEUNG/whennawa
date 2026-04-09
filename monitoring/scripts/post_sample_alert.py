import json
import urllib.request
payload = {
  "receiver": "whennawa-email",
  "status": "firing",
  "title": "호스트 CPU 사용률 높음",
  "alerts": [
    {
      "status": "firing",
      "labels": {"alertname": "호스트 CPU 사용률 높음", "scope": "host", "severity": "warning"},
      "annotations": {"summary": "호스트 CPU 사용률이 90%를 초과했습니다."},
      "generatorURL": "http://3.36.87.146:3001/alerting/grafana/whennawa-host-cpu-high/view",
      "startsAt": "2026-04-03T08:00:00Z"
    }
  ]
}
req = urllib.request.Request(
  "http://127.0.0.1:18080/grafana-alert",
  data=json.dumps(payload).encode("utf-8"),
  headers={"Content-Type": "application/json"},
  method="POST"
)
with urllib.request.urlopen(req, timeout=20) as response:
    print(response.read().decode())
