from http.server import HTTPServer, BaseHTTPRequestHandler
import json

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers['Content-Length'])
        body = json.loads(self.rfile.read(length))
        print("받은 요청:", json.dumps(body, ensure_ascii=False))

        user_text = body["messages"][0]["content"]
        response = {
            "id": "msg_mock123",
            "type": "message",
            "role": "assistant",
            "content": [{
                "type": "text",
                "text": "[MOCK 요약] " + user_text[:40] + "..."
            }],
            "model": "claude-haiku-4-5-mock",
            "stop_reason": "end_turn"
        }
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(response).encode())

    def log_message(self, format, *args):
        print(f"[MOCK SERVER] {format % args}")

print("Fake Anthropic server running on http://localhost:8888")
HTTPServer(('localhost', 8888), Handler).serve_forever()
