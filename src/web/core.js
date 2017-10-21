// Adapted from OpenAI's World of Bits core.js.

var core = {}

// various common utilities

core.randi = function(min, max) {
  return Math.floor(Math.random()*(max-min)+min);
}

core.randf = function(min, max) {
  return Math.random()*(max-min)+min;
}

core.sample = function(lst) {
  var ix = core.randi(0,lst.length);
  return lst[ix];
}

// utilities for timing episodes
core.EPISODE_MAX_TIME = 10000; // in ms. Set default time to 10s.

// https://stackoverflow.com/questions/3169786/clear-text-selection-with-javascript
// this piece of code clears the selection in a new episode, if a user happened
// to select some part of text. We don't want this to persist across episodes
var clearUserSelection = function() {
  if (window.getSelection) {
    if (window.getSelection().empty) {  // Chrome
      window.getSelection().empty();
    } else if (window.getSelection().removeAllRanges) {  // Firefox
      window.getSelection().removeAllRanges();
    }
  } else if (document.selection) {  // IE?
    document.selection.empty();
  }
}

core.EP_TIMER = null; // stores timer id
core.CD_TIMER = null; // stores timer ID for displaying rewards
core.ept0; // stores system time when episode begins (so we can time it)

core.startEpisode = function(queryStr) {
  clearUserSelection();
  core.createDisplay();
  core.updateQuery(queryStr);
  core.ept0 = new Date().getTime();
  core.countdownTimer(core.EPISODE_MAX_TIME);
  // start an end of episode timer
  if(core.EP_TIMER !== null) { clearTimeout(core.EP_TIMER); } // reset timer if needed
  core.EP_TIMER = setTimeout(function(){
    core.endEpisode(-1); // time ran out
  }, core.EPISODE_MAX_TIME);
}

core.endEpisode = function(reward, time_proportional) {
  // stop timer and set to null, so that only one event gets rewarded
  // for any given episode.
  if(core.EP_TIMER !== null) {
    clearTimeout(core.EP_TIMER);
    core.EP_TIMER = null;
  } else {
    // if timer is null, don't reward anything and exit out.
    return;
  }
  var ept1 = new Date().getTime(); // get system time

  // adjust reward based on time, so acting early is encouraged
  if(typeof time_proportional === 'undefined') { time_proportional = false; }
  if(time_proportional) {
    var dt = ept1 - core.ept0; // difference in ms since start of ep
    reward = reward * Math.max(0, 1.0 - dt/core.EPISODE_MAX_TIME);
  }

  console.log('reward: ' + reward);
  core.updateDisplay(reward);
  core.clearTimer();
}

// returns parameters passed in the url.
// e.g. ?topic=123&name=query+string in the url would return
// QueryString["topic"];    // 123
// QueryString["name"];     // query string
// QueryString["nothere"];  // undefined (object)
core.QueryString = (function(a) {
  if (a == "") return {};
  var b = {};
  for (var i = 0; i < a.length; ++i)
  {
    var p=a[i].split('=', 2);
    if (p.length == 1)
      b[p[0]] = "";
    else
      b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
  }
  return b;
})(window.location.search.substr(1).split('&'));

core.getOpt = function(d, k, def) {
  var v = d[k]
  return typeof v === 'undefined' ? def : v;
}

// template used to create the reward display HUD. This HTML
// gets wrapped inside a <div id='reward-display'> element.

core.DISPLAY_HTML = `
  <div id="reward-hide" onclick="core.hideDisplay();">X</div>
  <div class="info query-area">
    <label>Query:</label>
    <span id="query">-</span>
  </div>
  <div class="info">
      <label>Reward:</label>
      <span id='reward'>-</span>
  </div>
  <div class="info">
      <label>Time left:</label>
      <span id='timer-countdown'>-</span>
  </div>
  <button id="reset" onclick="core.reset();">Reset</button>
`;

// create element via JS; appending the HTML template
// directly to the body will cause jQuery UI elements
// to freak out.
core.createDisplay = function(){
  var display = document.getElementById('reward-display');
  if(display === null){
    var newDiv = document.createElement('div');
    newDiv.setAttribute('id', 'reward-display');
    newDiv.innerHTML = core.DISPLAY_HTML;
    document.body.appendChild(newDiv);
  }
}

core.updateQuery = function(queryStr){
  document.getElementById('query').innerText = queryStr;
}

core.updateDisplay = function(reward){
  document.getElementById('reward').innerHTML = reward;
}

// use RGB values for setting CSS font color.
// red value should increase as number goes towards -1
// green value should increase as number goes towards +1.
core.computeColor = function(reward){
  var red = 255;
  var green = 255;
  if(reward <= 0) green = parseInt(255*(1-Math.abs(reward)));
  else red = parseInt(255*(1-reward));
  return "rgb(" + red + "," + green + ",0);"
}

core.hideDisplay = function(){
  document.getElementById('reward-display').setAttribute('style', 'display: none');
}


core.countdownTimer = function(et){
  core.clearTimer();
  var episodeTime = et/1000;
  var currentTime = et/1000;
  var intervalTime = 1000;
  // update the timer immediately to display the total episode
  // time on start, eg. "10 / 10s"
  updateTimer();
  // set an interval so that the timer text will be updated
  // based on the `intervalTime` (ie. every 1sec)
  core.CD_TIMER = setInterval(updateTimer, intervalTime);

  function updateTimer(){
    var cd = document.getElementById('timer-countdown');
    if (currentTime <= 0){
      cd.setAttribute('style', 'color: red');
      cd.innerHTML = 'done';
      window.clearInterval(core.CD_TIMER);
      return;
    } else {
      var frac = currentTime / episodeTime;
      if(frac > 0.75) { var col = 'green'; }
      else if(frac > 0.5) { var col = 'yellow'; }
      else if(frac > 0.25) { var col = 'orange'; }
      else { var col = 'red'; }
      cd.setAttribute('style', 'color:' + col);
      cd.innerHTML = currentTime + ' / ' + episodeTime + 'sec';
      currentTime-=intervalTime/1000;
    }
  }
};

core.clearTimer = function(){
  window.clearInterval(core.CD_TIMER);
  var cd = document.getElementById('timer-countdown');
  cd.setAttribute('style', 'color: black');
  cd.innerHTML = 'done';
}

core.reset = function(){
  document.getElementById("reward").innerText = "-";
  var queryStr = genProblem();
  core.startEpisode(queryStr);
}