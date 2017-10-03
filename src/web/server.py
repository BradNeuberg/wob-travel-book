#!/usr/bin/env python
"""
Web server to efficiently serve up the WOB travel booking sandbox.
"""
import gzip
import logging
import os
import threading
from BaseHTTPServer import HTTPServer
from SimpleHTTPServer import SimpleHTTPRequestHandler
from SocketServer import ThreadingMixIn
import StringIO


logging.getLogger("").setLevel(logging.INFO)


class TravelBookHandler(SimpleHTTPRequestHandler):
    simplified_routes = None
    simplified_routes_mtime_s = None

    def do_GET(self):
        # Our routes file is quite large; make sure to GZip compress it and have good caching headers
        # to improve page loading time to speed up experiments.
        logging.info(self.path)
        if "simplified_routes.json" in self.path:
            logging.info("Request for simplified_routes.js...")
            content = TravelBookHandler.simplified_routes
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript")
            self.send_header("Content-Length", str(len(str(content))))
            self.send_header("Content-Encoding", "gzip")
            # Cache this file forever.
            self.send_header("Cache-Control", "max-age=31536000") # One year
            self.send_header("Last-Modified", self.date_time_string(self.simplified_routes_mtime_s))
            self.end_headers()
            self.wfile.write(content)
            self.wfile.flush()
            logging.info("--Request for simplified_routes.js finished")
        else:
            SimpleHTTPRequestHandler.do_GET(self)


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in a separate thread."""


def gzip_encode(content):
    out = StringIO.StringIO()
    f = gzip.GzipFile(fileobj=out, mode='w', compresslevel=5)
    f.write(content)
    f.close()
    return out.getvalue()


def main(host="127.0.0.1", port=8000, simplified_routes_path="./data/simplified_routes.js"):
    with open(simplified_routes_path, "rb") as f:
        simplified_routes = f.read()

    TravelBookHandler.simplified_routes = gzip_encode(simplified_routes)
    TravelBookHandler.simplified_routes_mtime_s = os.path.getmtime(simplified_routes_path)
    TravelBookHandler.protocol_version = "HTTP/1.1"
    httpd = ThreadedHTTPServer((host, port), TravelBookHandler)

    logging.info("Serving at host {} and port {}".format(host, port))
    httpd.serve_forever()


if __name__ == "__main__":
    main()