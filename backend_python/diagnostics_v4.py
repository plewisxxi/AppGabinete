import urllib.request
import json

urls = [
    "http://127.0.0.1:4000/api/gastos",
    "http://127.0.0.1:4000/api/stats/gastos-total?year=2024",
    "http://127.0.0.1:4000/openapi.json"
]

for url in urls:
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            print(f"URL: {url} - Status: {response.getcode()}")
            content = response.read().decode()
            if "openapi" in url:
                print(f"Gastos in openapi: {'/api/gastos' in content}")
            else:
                data = json.loads(content)
                print(f"Response data: {data}")
    except Exception as e:
        print(f"URL: {url} - Error: {e}")
