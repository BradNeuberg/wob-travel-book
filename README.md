# Introduction

This repo contains a small sandbox implementing a web-based flight booking site, useful for training Reinforcement Learning agents for the World of Bits problem.

# Installation

Make sure Python 2.7+ is installed, setup a virtualenv environment, and install PIP dependencies:


```
mkvirtualenv scripts
workon scripts

pip install -r requirements.txt
```

Ensure your `PYTHONPATH` is correct to where you've checked the git repo out plus the `src` sub-directory:

```
export PYTHONPATH=$PYTHONPATH:~/src/wob/wob-travel-book/src
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

# Running Web Server

```
./src/web/server.py
```

In browser navigate to: http://127.0.0.1:8000/src/web/

You will need to provide on the URL the correct templated origin, destination, departure, and what you are optimizing for (either "lowest_price" or "shortest_duration"). Example:

http://127.0.0.1:8000/src/web/?origin=JFK&destination=SFO&departure=12/29/2017&optimize=shortest_duration

# Setup Selenium

We use Selenium to drive the flight sandbox via OpenAI Gym. To setup, download the latest Chrome WebDriver first (https://sites.google.com/a/chromium.org/chromedriver/downloads) and make sure it is in your `PATH`, such as placing it into `/usr/bin` or `/usr/local/bin`.

You don't need to manually start Selenium; the OpenAI Gym wrapper will automatically start it.

# Running Flight Gym

Open another console and start:

```
./src/flight_gym/flight_gym.py
```