// Configure our core RL framework.
core.EPISODE_MAX_TIME = 30000;  // set episode interval to 30 seconds

current_reward = 0;
query = {};

function setupDetails(simplifiedRoutes){
    // TODO: Think about adding some randomness into our base routes and
    // results at some point.

    // TODO(bneuberg): We should probably setup these dictionaries
    // in the simplify_data.py script beforehand.
    var routeDetails = {};
    for (var i = 0; i < simplifiedRoutes.length; i++){
        var originDetails = simplifiedRoutes[i];
        routeDetails[originDetails.airport_origin] = {};
        for (var j = 0; j < originDetails.destinations.length; j++){
            var destDetails = originDetails.destinations[j];
            routeDetails[originDetails.airport_origin][destDetails.dest] = {};
            for (var k = 0; k < destDetails.dates.length; k++){
                var dateDetails = destDetails.dates[k];
                var origin = originDetails.airport_origin;
                var dest = destDetails.dest;
                routeDetails[origin][dest][dateDetails.departure_date] = dateDetails;
            }
        }
    }
    return routeDetails;
}

function showSearchResults(routeDetails, origin, destination, departure){
    var results = getResults(routeDetails, origin, destination, departure);
    if (!results){
        return;
    }

    $("#search-page").addClass("hidden-section");
    $("#results-page").removeClass("hidden-section");

    $("#sort").change(function(evt){
        if (evt.target.value == 'lowest_price'){
            sortByLowestPrice(origin, destination, departure, results);
        } else if (evt.target.value == 'shortest_duration'){
            sortByShortestDuration(origin, destination, departure, results);
        }
    });

    updateResults(origin, destination, departure, results);
}

function sortByLowestPrice(origin, destination, departure, results){
    results.sort(function(a, b){
        var a_price = parseFloat(a.sale_total.replace("USD", ""));
        var b_price = parseFloat(b.sale_total.replace("USD", ""));
        if (a_price < b_price){
            return -1;
        } else if (a_price == b_price){
            return 0;
        } else {
            return 1;
        }
    });
    updateResults(origin, destination, departure, results);
}

function sortByShortestDuration(origin, destination, departure, results){
    results.sort(function(a, b){
        var a_time = a.duration_minutes;
        var b_time = b.duration_minutes;
        if (a_time < b_time){
            return -1;
        } else if (a_time == b_time){
            return 0;
        } else {
            return 1;
        }
    });
    updateResults(origin, destination, departure, results);
}

function updateResults(origin, destination, departure, results){
    $("#results-page .result").remove();

    var template = $(".result-template");
    results.forEach(function(result){
        var node = template.clone();
        node.removeClass("result-template").addClass("result");
        var segments = result.segments;

        var startTime = toTimeStr(segments[0].departure_time);
        var endTime = toTimeStr(segments[segments.length - 1].arrival_time);
        $(".start-and-end", node).text(startTime + " - " + endTime);

        var startAirport = segments[0].origin;
        var endAirport = segments[segments.length - 1].destination;
        $(".start-stop-airports", node).text(startAirport + " - " + endAirport);

        var airline = segments.length == 1 ? segments[0].flight_carrier : "Multiple Airlines";
        $(".airline", node).text(airline);

        var durationHours = Math.floor(result.duration_minutes / 60);
        var durationMinutes = result.duration_minutes % 60;
        var totalDuration = "";
        if (durationMinutes > 0){
            totalDuration = durationHours + "h " + durationMinutes + "m";
        } else {
            totalDuration = durationHours + "h";
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

            var layoverCities = segments.slice(1).map(function(entry){
                return entry.origin;
            });
            layovers += layoverCities.join(",");
        }
        $(".layover-details", node).text(layovers);

        var price = result.sale_total.replace("USD", "$");
        $(".total-price", node).text(price);

        $("button.select", node).click(function(){
            selectResult(origin, destination, departure, result);
        });

        $("#results-page #results").append(node);
    });
}

function toTimeStr(time){
    var date = new Date(time);
    var hours = String(date.getUTCHours());
    var minutes = String(date.getUTCMinutes());
    if (hours.length == 1){
        hours = "0" + hours;
    }
    if (minutes.length == 1){
        minutes = "0" + minutes;
    }
    return hours + ":" + minutes;
}

function selectResult(origin, destination, departure, result){
    var correctStr = query["origin"] + " -> " +
                     query["destination"] + " on " +
                     query["departure"] + " focused on " +
                     query["optimize"].replace("_", " ");

    var correctResult = false;
    // TODO: Perhaps think about giving partial credit for being partially
    // correct on some of these for reward shaping.
    if (query["origin"] == origin &&
        query["destination"] == destination &&
        query["departure"] == departure){
        if (query["optimize"] == "lowest_price" && result.cheapest_fare){
            correctResult = true;
        } else if (query["optimize"] == "shortest_duration" && result.shortest_duration){
            correctResult = true;
        }
    }
    var actualStr = origin + " -> " + destination + " on " +
                    departure + " lowest price: " + result.cheapest_fare +
                    " shortest duration: " + result.shortest_duration;
    console.log("Selected result, correct result: " + correctResult +
                ", correct details: '" + correctStr +
                "', actual details: '" + actualStr + "'");

    var finalScore = correctResult ? 1 : -1;
    core.endEpisode(finalScore, correctResult);
}

function getResults(routeDetails, origin, destination, departure){
    var originDetails = routeDetails[origin];
    if (!originDetails){
        printUnknown("Origin", origin);
        return;
    }

    var destinationDetails = originDetails[destination];
    if (!destinationDetails){
        printUnknown("Destination", destination);
        return;
    }

    // Calender widget gives results as MM/DD/YYYY, but we need to turn
    // it into YYYY_MM_DD.
    var pieces = departure.split("/")
    var date = pieces[2] + "_" + pieces[0] + "_" + pieces[1];
    var departureDetails = destinationDetails[date];

    if (!departureDetails){
        printUnknown("Departure Date", date);
        return;
    }

    return departureDetails.results;
}

function printUnknown(unknownType, details){
    $("#unknown-page .unknown-type").text(unknownType);
    $("#unknown-page .unknown-details").text(details);
    $("#search-page").addClass("hidden-section");
    $("#unknown-page").removeClass("hidden-section");

    core.endEpisode(-1);
}

function resetUI(){
    current_reward = 0;
    query = {};
    $('input').each(function(idx, elem){
        elem.value = "";
    });
    $('#search-page').removeClass('hidden-section');
    $('section:not(#search-page)').addClass('hidden-section');
    $('#sort').val("lowest_price");
}

function generateRandomQuery(routeDetails){
    // TODO: Set the random seed for repeatable tests.
    var origins = Object.keys(routeDetails);
    var origin = origins[Math.floor(Math.random() * origins.length)];

    var destinations = Object.keys(routeDetails[origin]);
    var destination = destinations[Math.floor(Math.random() * destinations.length)];

    var departures = Object.keys(routeDetails[origin][destination]);
    var departure = departures[Math.floor(Math.random() * departures.length)];
    // Change from YYYY_MM_DD to MM/DD/YYYY.
    var matches = departure.match(/([0-9]{4})_([0-9]{2})_([0-9]{2})/);
    departure = matches[2] + "/" + matches[3] + "/" + matches[1];

    var optimize;
    if (Math.floor(Math.random() * 2) == 0){
        optimize = "lowest_price";
    } else {
        optimize = "shortest_duration";
    }

    query = {
        origin: origin,
        destination: destination,
        departure: departure,
        optimize: optimize
    };

    return "Find a flight from " + origin + " to " + destination +
        " departing " + departure + " with the " + optimize.replace("_", " ");
}

function genProblem(){
    resetUI();
    var routeDetails = setupDetails(window.simplified_routes);
    var queryStr = generateRandomQuery(routeDetails);

    $("#departure").datepicker();
    $("#search-form").submit(function(e){
        e.preventDefault();

        $(".required").removeClass("required");

        var origin = $("#origin").val();
        if (!origin){
            $("label[for='origin']").addClass("required");
        }

        var destination = $("#destination").val();
        if (!destination){
            $("label[for='destination']").addClass("required");
        }

        var departure = $("#departure").val();
        if (!departure){
            $("label[for='departure']").addClass("required");
        }

        // TODO: See if some reward shaping by giving partial credit if the correct
        // origin, destination, or departure are given is useful.

        if (origin && destination && departure){
            $(".required").removeClass("required");
            showSearchResults(routeDetails, origin, destination, departure)
        }
    });

    return queryStr;
}

$(function(){
    var queryStr = genProblem(); // start things off on load immediately
    core.startEpisode(queryStr);
});
