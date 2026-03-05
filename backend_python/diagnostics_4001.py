import urllib.request
import json

urls = [
    "http://localhost:4001/api/gastos",
    "http://localhost:4001/api/stats/sesiones-estado?year=2024",
    "http://localhost:4001/openapi.json"
]

for url in urls:
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            print(f"URL: {url} - Status: {response.getcode()}")
            if "openapi" in url:
                data = response.read().decode()
                print(f"Gastos in openapi: {'/api/gastos' in data}")
                print(f"Gastos total in openapi: {'/api/stats/gastos-total' in data}")
    except Exception as e:
        print(f"URL: {url} - Error: {e}")
