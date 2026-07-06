with open("agent-backend/server.py", "r") as f:
    content = f.read()

content = content.replace("from http.server import HTTPServer, BaseHTTPRequestHandler", "from http.server import HTTPServer, ThreadingHTTPServer, BaseHTTPRequestHandler")
content = content.replace("httpd = HTTPServer(server_address, QuoteAPIHandler)", "httpd = ThreadingHTTPServer(server_address, QuoteAPIHandler)")

with open("agent-backend/server.py", "w") as f:
    f.write(content)
