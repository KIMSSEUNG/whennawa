import urllib.parse, urllib.request
queries = [
    'topk(20, rate(container_cpu_usage_seconds_total[5m]))',
    'topk(20, container_last_seen)',
]
for q in queries:
    url = 'http://127.0.0.1:9090/api/v1/query?query=' + urllib.parse.quote(q, safe='')
    print('===QUERY===')
    print(q)
    print(urllib.request.urlopen(url, timeout=20).read().decode())
