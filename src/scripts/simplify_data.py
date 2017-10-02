#!/usr/bin/env python
"""
Takes our complex, large raw QPX data and simplifies it to just duration
and cost.
"""
import gflags
import os
import sys
import json


def simplify_entry(raw_path_root, origin, dest, date_str):
    """
    Given an origin, destination, and date, simplifies to just the JSON we care about for that date entry.
    """
    raw_path = os.path.join(raw_path_root, origin, dest, date_str)
    with open(raw_path, "r") as f:
        data = json.load(f)

    aircrafts = {entry["code"]: entry for entry in data["trips"]["data"]["aircraft"]}
    airports = {entry["code"]: entry for entry in data["trips"]["data"]["airport"]}
    carriers = {entry["code"]: entry for entry in data["trips"]["data"]["carrier"]}
    cities = {entry["code"]: entry for entry in data["trips"]["data"]["city"]}
    
    results = []
    for result in data["trips"]["tripOption"]:
        sale_total = result["saleTotal"]
        assert len(result["slice"]) == 1
        trip_slice = result["slice"][0]
        duration_minutes = trip_slice["duration"]

        segments = []
        for segment in trip_slice["segment"]:
            for leg in segment["leg"]:
                segments.append({
                    "flight_carrier": carriers[segment["flight"]["carrier"]]["name"],
                    "flight_number": segment["flight"]["number"],
                    "aircraft_type": aircrafts[leg["aircraft"]]["name"],
                    "arrival_time": leg["arrivalTime"],
                    "departure_time": leg["departureTime"],
                    "destination": leg["destination"],
                    "duration_minutes": leg["duration"],
                    "origin": leg["origin"],
                })

        results.append({
            "duration_minutes": duration_minutes,
            "sale_total": sale_total,
            "cheapest_fare": False,
            "shortest_duration": False,
            "segments": segments,  
        })

    mark_shortest_duration(results)
    mark_cheapest_fare(results)
    
    return results


def mark_cheapest_fare(results):
    cheapest_price = None
    cheapest_entries = []
    for result in results:
        assert result["sale_total"].startswith("USD")
        result_price = float(result["sale_total"][3:])
        if cheapest_price is None:
            cheapest_price = result_price
            cheapest_entries.append(result)
        elif cheapest_price > result_price:
            cheapest_price = result_price
            cheapest_entries = [result]
        elif cheapest_price == result_price:
            cheapest_entries.append(result)
    
    for cheapest_entry in cheapest_entries:
        cheapest_entry["cheapest_fare"] = True


def mark_shortest_duration(results):
    shortest_duration = None
    shortest_entries = []
    for result in results:
        result_duration = result["duration_minutes"]
        if shortest_duration is None:
            shortest_duration = result_duration
            shortest_entries.append(result)
        elif shortest_duration > result_duration:
            shortest_duration = result_duration
            shortest_entries = [result]
        elif shortest_duration == result_duration:
            shortest_entries.append(result)

    for shortest_entry in shortest_entries:
        shortest_entry["shortest_duration"] = True


def main(raw_path_root, output_filename):
    raw_path_root = "./data/raw"
    os.listdir(raw_path_root)
    routes = []
    for origin in os.listdir(raw_path_root):
        origin_details = {"airport_origin": origin, "destinations": []}
        for dest in os.listdir(os.path.join(raw_path_root, origin)):
            dest_details = {"dest": dest, "dates": []}
            for date_entry in os.listdir(os.path.join(raw_path_root, origin, dest)):
                print("{} -> {}: {}".format(origin, dest, date_entry))
                date_details = {
                    "departure_date": os.path.splitext(date_entry)[0],
                    "results": simplify_entry(raw_path_root, origin, dest, date_entry),
                }
                dest_details["dates"].append(date_details)
            origin_details["destinations"].append(dest_details)
        routes.append(origin_details)

    print("Saving results to {}".format(output_filename))
    with open(output_filename, "w") as f:
        f.write("window.simplified_routes = ")
        json.dump(routes, f, indent=4, sort_keys=True)
        f.write(";")

if __name__ == "__main__":
    gflags.DEFINE_string(
        "raw_path_root",
        default="./data/raw",
        help="Where our raw QPX request data was saved")
    gflags.DEFINE_string(
        "output_filename",
        default="./data/simplified_routes.js",
        help="The final simplified JSON file that will contain our route data")
    gflags.FLAGS.UseGnuGetOpt(True)
    gflags.FLAGS(sys.argv)

    main(gflags.FLAGS.raw_path_root, gflags.FLAGS.output_filename)