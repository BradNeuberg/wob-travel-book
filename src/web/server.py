#!/usr/bin/env python
"""
Web server to efficiently serve up the WOB travel booking sandbox.
"""
import gzip
import logging
from BaseHTTPServer import HTTPServer
from SimpleHTTPServer import SimpleHTTPRequestHandler
import StringIO


logging.getLogger("").setLevel(logging.INFO)


class TravelBookHandler(SimpleHTTPRequestHandler):
    simplified_routes = None

    def do_GET(self):
        # Our routes file is quite large; make sure to GZip compress it and have good caching headers
        # to improve page loading time to speed up experiments.
        logging.info(self.path)
        if "simplified_routes.json" in self.path:
            content = TravelBookHandler.simplified_routes
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(str(content))))
            self.send_header("Content-Encoding", "gzip")
            # Cache this file forever; clients will need to append a query string to the end with a
            # version to invalidate and get a new version, such as fetching
            # simplified_routes.json?version=1.
            self.send_header("Cache-Control", "max-age=31556926") # One year
            self.end_headers()
            self.wfile.write(content)
            self.wfile.flush()
        else:
            SimpleHTTPRequestHandler.do_GET(self)


def gzip_encode(content):
    out = StringIO.StringIO()
    f = gzip.GzipFile(fileobj=out, mode='w', compresslevel=5)
    f.write(content)
    f.close()
    return out.getvalue()


def main(host="127.0.0.1", port=8000, simplified_routes_path="./data/simplified_routes.json"):
    with open(simplified_routes_path, "rb") as f:
        simplified_routes = f.read()

    TravelBookHandler.simplified_routes = gzip_encode(simplified_routes)
    TravelBookHandler.protocol_version = "HTTP/1.1"
    httpd = HTTPServer((host, port), TravelBookHandler)

    logging.info("Serving at host {} and port {}".format(host, port))
    httpd.serve_forever()


if __name__ == "__main__":
    main()