import urllib.request
text = urllib.request.urlopen('http://127.0.0.1:9200/metrics', timeout=20).read().decode('utf-8', 'ignore')
count = 0
for line in text.splitlines():
    if line.startswith('container_cpu_usage_seconds_total') and 'docker-' in line:
        print(line)
        count += 1
        if count >= 8:
            break
