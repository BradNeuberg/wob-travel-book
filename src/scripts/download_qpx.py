#!/usr/bin/env python
"""
Downloads QPX raw booking data for a set of cities and range of dates.
"""

from datetime import (
    timedelta,
    date,
    )
import json
import os
import sys

import gflags
import requests


ROUTES = [
    {'from': 'SFO', 'to': 'JFK'},
    {'from': 'SFO', 'to': 'BOS'},
    {'from': 'SFO', 'to': 'LHR'},

    {'from': 'JFK', 'to': 'SFO'},
    {'from': 'JFK', 'to': 'BOS'},
    {'from': 'JFK', 'to': 'LHR'},
]


START_DATE = date(2017, 12, 26)
END_DATE = date(2018, 1, 4)


def next_city():
    for i in xrange(len(ROUTES)):
        yield ROUTES[i]


def daterange(start_date, end_date):
    for n in xrange(int((end_date - start_date).days)):
        yield start_date + timedelta(n)


def fetch_raw_solution(origin, dest, date, api_key):
    url = "https://www.googleapis.com/qpxExpress/v1/trips/search?key=" + api_key
    headers = {"content-type": "application/json"}
    params = {
      "request": {
        "slice": [
          {
            "origin": origin,
            "destination": dest,
            "date": date.strftime("%Y-%m-%d"),
          }
        ],
        "passengers": {
          "adultCount": 1
        },
        "solutions": 50,
        "refundable": False
      }
    }
    print("Fetching details for origin: {}, dest: {}, date: {}".format(
        origin, dest, date.strftime("%Y-%m-%d")))
    response = requests.post(url, data=json.dumps(params), headers=headers)
    data = response.json()
    return data


def save_raw(origin, dest, date, data, out_raw):
    # Save results in directory name {origin}/{dest}, with the file being named {date}
    dest_path = os.path.join(out_raw, origin, dest)
    date_filename = os.path.join(dest_path, date.strftime("%Y_%m_%d") + ".json")
    if not os.path.exists(dest_path):
        os.makedirs(dest_path)
    print("\tSaving {} -> {} for {} to {}".format(origin, dest, date.strftime("%Y-%m-%d"),
                                                  date_filename))
    with open(date_filename, "w") as f:
        # Make sure results are saved as Unicode.
        json.dump(data, f)


def main(api_key, out_raw):
    if not os.path.exists(gflags.FLAGS.out_raw):
        os.makedirs(gflags.FLAGS.out_raw)

    for trip_details in next_city():
        for single_date in daterange(START_DATE, END_DATE):
            data = fetch_raw_solution(trip_details['from'], trip_details['to'], single_date,
                                      api_key)
            save_raw(trip_details['from'], trip_details['to'], single_date, data, out_raw)


if __name__ == "__main__":
    gflags.DEFINE_string(
        "out_raw",
        default="./data/raw",
        help="Where to save our raw request data")
    gflags.DEFINE_string(
        "api_key",
        default=None,
        help="The QPX API key to use")
    gflags.MarkFlagAsRequired('api_key')
    gflags.FLAGS.UseGnuGetOpt(True)
    gflags.FLAGS(sys.argv)

    main(gflags.FLAGS.api_key, gflags.FLAGS.out_raw)
