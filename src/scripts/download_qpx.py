"""
Downloads QPX raw booking data for a set of cities and range of dates.
"""

from datetime import (
    timedelta,
    date,
    )
import json
import sys

import gflags
import requests


ROUTES = [
    {'from': 'SFO', 'to': 'JFK'},
    # {'from': 'SFO', 'to': 'BOS'},
    # {'from': 'SFO', 'to': 'LHR'},

    # {'from': 'JFK', 'to': 'SFO'},
    # {'from': 'JFK', 'to': 'BOS'},
    # {'from': 'JFK', 'to': 'LHR'},
]


START_DATE = date(2017, 12, 26)
END_DATE = date(2017, 12, 27)
#END_DATE = date(2018, 1, 4)


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


def main(api_key):
    for trip_details in next_city():
        print(trip_details)
        for single_date in daterange(START_DATE, END_DATE):
            print("\t" + single_date.strftime("%Y-%m-%d"))

            data = fetch_raw_solution(trip_details['from'], trip_details['to'], single_date,
                                      api_key)
            print(data)


if __name__ == "__main__":
    gflags.DEFINE_string(
        "api_key",
        # TODO: Use a shell variable instead of checking this in!
        default="AIzaSyBa4twbD2iqtipo3GWIVyGzGau2dYLpLUw",
        help="The QPX API key to use")
    gflags.FLAGS.UseGnuGetOpt(True)
    gflags.FLAGS(sys.argv)

    main(gflags.FLAGS.api_key)
