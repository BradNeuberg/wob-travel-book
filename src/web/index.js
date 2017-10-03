function setupDetails(simplifiedRoutes){
    // TODO(bneuberg): We should probably setup these dictionaries
    // in the simplify_data.py script beforehand.
    routeDetails = {};
    for (var i = 0; i < simplifiedRoutes.length; i++){
        originDetails = simplifiedRoutes[i];
        routeDetails[originDetails.airport_origin] = {};
        for (var j = 0; j < originDetails.destinations.length; j++){
            destDetails = originDetails.destinations[j];
            routeDetails[originDetails.airport_origin][destDetails.dest] = {};
            for (var k = 0; k < destDetails.dates.length; k++){
                dateDetails = destDetails.dates[k];
                origin = originDetails.airport_origin;
                dest = destDetails.dest;
                routeDetails[origin][dest][dateDetails.departure_date] = dateDetails;
            }
        }
    }
    return routeDetails;
}

function showResults(routeDetails, origin, destination, departure){
    results = getResults(routeDetails, origin, destination, departure);
    if (!results){
        return;
    }

    $("#search-page").toggleClass("hidden-section");
    $("#results-page").toggleClass("hidden-section");

    $("#results-page .result").remove();

    template = $(".result-template");
    for (var i = 0; i < results.length; i++){
        result = results[i];
        node = template.clone();
        node.removeClass("result-template").addClass("result");
        segments = result.segments;

        var startTime = toTimeStr(segments[0].departure_time);
        var endTime = toTimeStr(segments[segments.length - 1].arrival_time);
        $(".start-and-end", node).text(startTime + " - " + endTime);

        var startAirport = segments[0].origin;
        var endAirport = segments[segments.length - 1].destination;
        $(".start-stop-airports", node).text(startAirport + " - " + endAirport);

        var airline = segments.length == 1 ? segments[0].flight_carrier : "Multiple Airlines";
        $(".airline", node).text(airline);

        durationHours = Math.floor(result.duration_minutes / 60);
        durationMinutes = result.duration_minutes % 60;
        var totalDuration = "";
        if (durationMinutes > 0){
            totalDuration = durationHours + "h " + durationMinutes + "m";
        } else {
            tutalDuration = durationHours + "h";
        }
        $(".total-time", node).text(totalDuration);

        var num_stops = "No stops";
        if (segments.length == 1){
            num_stops = "1 stop";
        } else {
            num_stops = segments.length + " stops";
        }
        $(".num-stops", node).text(num_stops);

        var layovers = "";
        if (segments.length > 1){
            if (segments.length == 2){
                layovers = "Layover in ";
            } else {
                layovers = "Layovers in ";
            }

            layoverCities = segments.slice(1).map(function(entry){
                return entry.origin;
            });
            layovers += layoverCities.join(",");
        }
        $(".layover-details", node).text(layovers);

        price = result.sale_total.replace("USD", "$");
        $(".total-price", node).text(price);

        $("#results-page #results").append(node);
    }
}

function toTimeStr(time){
    date = new Date(time);
    hours = String(date.getUTCHours());
    minutes = String(date.getUTCMinutes());
    if (hours.length == 1){
        hours = "0" + hours;
    }
    if (minutes.length == 1){
        minutes = "0" + minutes;
    }
    return hours + ":" + minutes;
}

function getResults(routeDetails, origin, destination, departure){
    originDetails = routeDetails[origin];
    if (!originDetails){
        printUnknown("origin");
        return;
    }

    destinationDetails = originDetails[destination];
    if (!destinationDetails){
        printUnknown("destination");
        return;
    }

    // Calender widget gives results as MM/DD/YYYY, but we need to turn
    // it into YYYY_MM_DD.
    pieces = departure.split("/")
    date = pieces[2] + "_" + pieces[0] + "_" + pieces[1];
    departureDetails = destinationDetails[date];

    if (!departureDetails){
        printUnknown("departure date");
        return;
    }

    return departureDetails.results;
}

function printUnknown(unknownType){
    // TODO
}

$(function(){
    routeDetails = setupDetails(window.simplified_routes);
    console.log(routeDetails);

    $("#departure").datepicker();
    $("#search-form").submit(function(e){
        e.preventDefault();

        $(".required").removeClass("required");

        origin = $("#origin").val();
        if (!origin){
            $("label[for='origin']").addClass("required");
        }

        destination = $("#destination").val();
        if (!destination){
            $("label[for='destination']").addClass("required");
        }

        departure = $("#departure").val();
        if (!departure){
            $("label[for='departure']").addClass("required");
        }

        if (origin && destination && departure){
            showResults(routeDetails, origin, destination, departure)
        }
    });
});
