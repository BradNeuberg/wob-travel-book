# Installation

```
mkvirtualenv scripts
workon scripts

pip install -r requirements.txt
```

# Bootstrapping Data

Downloading raw QPX JSON data:

```
python ./src/scripts/download_qpx.py --api_key=<YOUR QPX API KEY>
```

The raw data is quite large, so we have a script that simplifies it into a single `simplified_routes.json` file for efficiently serving it on the web:

```
python ./scr/scripts/simplify_data.py
```

# Running Web Client/Server

```
./src/web/server.py
```

In browser navigate to: http://127.0.0.1:8000/src/web/