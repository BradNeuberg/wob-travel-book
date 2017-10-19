// Configure our core RL framework.
core.EPISODE_MAX_TIME = 30000;  // set episode interval to 30 seconds

current_reward = 0;

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

function showSearchResults(routeDetails, origin, destination, departure){
    results = getResults(routeDetails, origin, destination, departure);
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
        a_price = parseFloat(a.sale_total.replace("USD", ""));
        b_price = parseFloat(b.sale_total.replace("USD", ""));
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
        a_time = a.duration_minutes;
        b_time = b.duration_minutes;
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

    template = $(".result-template");
    results.forEach(function(result){
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

            layoverCities = segments.slice(1).map(function(entry){
                return entry.origin;
            });
            layovers += layoverCities.join(",");
        }
        $(".layover-details", node).text(layovers);

        price = result.sale_total.replace("USD", "$");
        $(".total-price", node).text(price);

        $("button.select", node).click(function(){
            selectResult(origin, destination, departure, result);
        });

        $("#results-page #results").append(node);
    });
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

function selectResult(origin, destination, departure, result){
    correctStr = core.QueryString["origin"] + " -> " +
                 core.QueryString["destination"] + " on " +
                 core.QueryString["departure"] + " focused on " +
                 core.QueryString["optimize"].replace("_", " ");

    var correctResult = false;
    // TODO: Perhaps think about giving partial credit for being partially
    // correct on some of these for reward shaping.
    if (core.QueryString["origin"] == origin &&
        core.QueryString["destination"] == destination &&
        core.QueryString["departure"] == departure){
        if (core.QueryString["optimize"] == "lowest_price" &&
            result.cheapest_fare){
            correctResult = true;
        } else if (core.QueryString["optimize"] == "shortest_duration" &&
            result.shortest_duration){
            correctResult = true;
        }
    }
    var actualStr = origin + " -> " + destination + " on " +
                    departure + " lowest price: " + result.cheapest_fare +
                    " shortest duration: " + result.shortest_duration;
    console.log("Selected result, correct result: " + correctResult +
                ", correct details: '" + correctStr +
                "', actual details: '" + actualStr + "'");

    finalScore = correctResult ? 1 : -1;
    core.endEpisode(finalScore, correctResult);
}

function getResults(routeDetails, origin, destination, departure){
    originDetails = routeDetails[origin];
    if (!originDetails){
        printUnknown("Origin", origin);
        return;
    }

    destinationDetails = originDetails[destination];
    if (!destinationDetails){
        printUnknown("Destination", destination);
        return;
    }

    // Calender widget gives results as MM/DD/YYYY, but we need to turn
    // it into YYYY_MM_DD.
    pieces = departure.split("/")
    date = pieces[2] + "_" + pieces[0] + "_" + pieces[1];
    departureDetails = destinationDetails[date];

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
    $('input').each(function(idx, elem){
        elem.value = "";
    });
    $('#search-page').removeClass('hidden-section');
    $('section:not(#search-page)').addClass('hidden-section');
    $('#sort').val("lowest_price");
}

function assertCorrectQueryString(){
    if (!core.QueryString["origin"]){
        console.error("Must provide desired 'origin' field in query string");
    }
    if (!core.QueryString["destination"]){
        console.error("Must provide desired 'destination' field in query string");
    }
    if (!core.QueryString["departure"]){
        console.error("Must provide desired 'departure' field in query string");
    }
    if (!core.QueryString["optimize"]){
        console.error("Must provide desired 'optimize' field in query string " +
                      "set to either 'lowest_price' or 'shortest_duration'");
    }
}

function genProblem(){
    resetUI();
    // TODO: Think about adding some randomness into our routes and results at some point.
    routeDetails = setupDetails(window.simplified_routes);

    assertCorrectQueryString();

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

        // TODO: See if some reward shaping by giving partial credit if the correct
        // origin, destination, or departure are given is useful.

        if (origin && destination && departure){
            $(".required").removeClass("required");
            showSearchResults(routeDetails, origin, destination, departure)
        }
    });
}

$(function(){
    genProblem(); // start things off on load immediately
    core.startEpisode();
});
