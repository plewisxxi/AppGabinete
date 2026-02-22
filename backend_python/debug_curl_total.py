import urllib.request
import json
import logging

def check_total():
    url = "http://localhost:4000/api/sesiones?q=pedagogica"
    try:
        print(f"Requesting {url}...")
        with urllib.request.urlopen(url) as response:
            print(f"Status: {response.status}")
            if response.status == 200:
                body = response.read().decode('utf-8')
                data = json.loads(body)
                total = data.get("total")
                print(f"Total returned by API: {total}")
                
                # We expect ~127 based on repro script
                if total == 127:
                    print("SUCCESS: Total matches expected filtered count.")
                else:
                    print(f"WARNING: Total {total} does not match expected 127 (unless data changed).")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    check_total()
