#!/usr/bin/env python3
import http.server
import socket
import socketserver
import os

PORT = 5000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
try:
    s.connect(('8.8.8.8', 80))
    local_ip = s.getsockname()[0]
except Exception:
    local_ip = '127.0.0.1'
finally:
    s.close()

print('=' * 60)
print('  📲 ZenGram Mobile App Server Running!')
print('=' * 60)
print(f'  1. Make sure your phone is connected to the same Wi-Fi network.')
print(f'  2. On your phone browser (Chrome, Safari, Kiwi), open:')
print(f'     👉 http://{local_ip}:{PORT}')
print(f'  3. Tap the browser menu (⋮ or Share) -> "Install App" / "Add to Home Screen"')
print('=' * 60)

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nServer stopped.')
