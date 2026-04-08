#!/usr/bin/env python3
"""Development server for the cell culture game."""

# Standard Library
import http
import http.server
import argparse
import pathlib
import subprocess


REPO_ROOT = pathlib.Path(__file__).resolve().parent
HTML_PATH = REPO_ROOT / "cell_culture_game.html"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 5080


#============================================
def ensure_built() -> None:
	"""Build the game HTML if it is missing or stale."""
	if HTML_PATH.is_file():
		return
	result = subprocess.run(
		["bash", "build_game.sh"],
		cwd=REPO_ROOT,
		check=False,
		capture_output=True,
		text=True,
	)
	if result.returncode != 0:
		raise RuntimeError(result.stderr or result.stdout or "Build failed.")


#============================================
def send_text(
	handler: http.server.BaseHTTPRequestHandler,
	content: str,
	content_type: str,
) -> None:
	"""Send a text response with no-store caching for local development."""
	data = content.encode("utf-8")
	handler.send_response(http.HTTPStatus.OK)
	handler.send_header("Content-Type", content_type)
	handler.send_header("Content-Length", str(len(data)))
	handler.send_header("Cache-Control", "no-store")
	handler.end_headers()
	handler.wfile.write(data)


#============================================
class ReuseAddrHTTPServer(http.server.ThreadingHTTPServer):
	"""HTTP server that reuses the address to avoid Address already in use errors."""

	allow_reuse_address = True


#============================================
class GameHandler(http.server.BaseHTTPRequestHandler):
	"""Serve the single-file game HTML and a health endpoint."""

	#============================================
	def do_GET(self) -> None:
		"""Route requests to the game page or health check."""
		if self.path == "/" or self.path == "/index.html":
			ensure_built()
			html = HTML_PATH.read_text(encoding="utf-8")
			send_text(self, html, "text/html; charset=utf-8")
			return
		if self.path == "/health":
			send_text(self, '{"status":"ok"}', "application/json; charset=utf-8")
			return
		self.send_error(http.HTTPStatus.NOT_FOUND, "Not Found")

	#============================================
	def log_message(self, format_string: str, *args: object) -> None:
		"""Suppress verbose request logging."""
		return


#============================================
def parse_args() -> argparse.Namespace:
	"""Parse command-line arguments."""
	parser = argparse.ArgumentParser(description="Development server for the cell culture game")
	parser.add_argument(
		'-p', '--port', dest='port', type=int, default=DEFAULT_PORT,
		help="Port to listen on (default: %(default)s)",
	)
	parser.add_argument(
		'-H', '--host', dest='host', type=str, default=DEFAULT_HOST,
		help="Host address to bind to (default: %(default)s)",
	)
	parser.add_argument(
		'-l', '--lan', dest='lan', action='store_true',
		help="Bind to 0.0.0.0 for LAN access (shortcut for --host 0.0.0.0)",
	)
	args = parser.parse_args()
	# --lan overrides --host
	if args.lan:
		args.host = "0.0.0.0"
	return args


#============================================
def main() -> None:
	"""Run the local development server."""
	args = parse_args()
	ensure_built()
	server = ReuseAddrHTTPServer((args.host, args.port), GameHandler)
	# Show the actual URL users should open
	if args.host == "0.0.0.0":
		print(f"Serving Cell Culture Game on all interfaces, port {args.port}")
		print(f"  Local:   http://127.0.0.1:{args.port}")
		print(f"  Network: http://<your-ip>:{args.port}")
	else:
		print(f"Serving Cell Culture Game at http://{args.host}:{args.port}")
	# KeyboardInterrupt is the expected shutdown signal for a dev server
	server.serve_forever()


if __name__ == "__main__":
	main()
