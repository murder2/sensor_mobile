const baseUrl = 'http://192.168.43.99:8000';
const IS_DEBUG = true;

let name = '';
let beacons = [];

function domLog(message) {
    var e = document.createElement('label');
    e.innerText = message;
    var br = document.createElement('br');
    
    document.body.appendChild(e);
    document.body.appendChild(br);
    
    window.scrollTo(0, window.document.height);
}

function debug(line) {
  if (IS_DEBUG) {
    domLog(line);
    console.log(`[debug] ${line}`);
  }
}

// Get the list of beacons that we should listen to from the server
function refreshBeacons() {
  debug('Refreshing beacons');
  get('/sensors/' + name, function(info){
    beacons = info.beacons;
  });
}

// Simple get request to the server
function get(path, callback) {
  debug('Getting path: ' + path);
  const xhr = new XMLHttpRequest();
  xhr.addEventListener("error", function() {
    debug('There was an error');
  });
  xhr.addEventListener('load', function() { 
    debug('Response for GET ' + path + ' : ' + this.responseText);
    const response = JSON.parse(this.responseText);
    callback(response);
  });
  xhr.open('GET', baseUrl + path, true /* async */);
  xhr.setRequestHeader('Content-type', 'application/json');
  xhr.send();
}

// Simple post request to the server, opt_callback can be provided and will be
// called with the response
function post(path, body, opt_callback) {
  debug('Posting to path: ' + path + ', body: ' + JSON.stringify(body));
  const xhr = new XMLHttpRequest();
  xhr.addEventListener("error", function() {
    debug('There was an error');
  });
  if(opt_callback) {
    xhr.addEventListener('load', function() { 
      debug('Response on path: ' + path + ', reponse: ' + this.responseText);
      const response = JSON.parse(this.responseText);
      opt_callback(response);
    });
  } else {
    xhr.addEventListener('load', function() {
      if(this.responseText.length != 0) {
        debug('Got response with no callback:' + this.responseText);   
      }
    });
  }

  xhr.open('POST', baseUrl + path, true /* async */);
  xhr.setRequestHeader('Content-type', 'application/json');
  xhr.send(JSON.stringify(body));
}

function beaconEquals(b1, b2) {
  const uid1 = (b1.uuid || b1.uid).replace(/-/g, '');
  const uid2 = (b2.uuid || b2.uid).replace(/-/g, '');
  return uid1 == uid2 && b1.major == b2.major && b1.minor == b2.minor;
}

// Send an event to the server
function sendEvent(bleacon) {
  const beacon = {uuid: bleacon.uuid, major: bleacon.major, minor: bleacon.minor};
  if (beacons.find(x => beaconEquals(x, beacon))) {
    debug('Advertising new event ' + JSON.stringify(bleacon));
    post('/sensors/' + name + '/event', {uuid: bleacon.uuid, major: bleacon.major, minor: bleacon.minor});
  } else {
    debug('Ignoring beacon : ' + JSON.stringify(beacon));
  }
}

function startListening() {
    var delegate = new cordova.plugins.locationManager.Delegate();

    delegate.didDetermineStateForRegion = function (pluginResult) {
        console.log('didDetermineStateForRegion:', pluginResult)
    };

    delegate.didStartMonitoringForRegion = function (pluginResult) {
        console.log('didStartMonitoringForRegion:', pluginResult);
    };

    delegate.didRangeBeaconsInRegion = function (pluginResult) {
        for(const beacon of pluginResult.beacons) {
            sendEvent(beacon)
        }
    };

    var identifier = "mySexyBeacons";
    var uuid = 'e09a777b-2959-4504-b85c-ec3406316ab6';
    var beaconRegion = new cordova.plugins.locationManager.BeaconRegion(identifier, uuid);

    cordova.plugins.locationManager.setDelegate(delegate);

    // required in iOS 8+
    cordova.plugins.locationManager.requestWhenInUseAuthorization(); 
    // or cordova.plugins.locationManager.requestAlwaysAuthorization()

    cordova.plugins.locationManager.startRangingBeaconsInRegion(beaconRegion)
        .fail(function(e) { debug('[error] ' + e); })
        .done();
}

function start() {
    name = document.getElementById('name').value

    debug('Start clicked with name set to: ' + name);

    if (!(name && name.length > 0)){
        debug('[error] Give me a name');
        return;
    }

    debug('Running new sensor. name: ' + name + ', server: ' + baseUrl); 

    // Announce we are here to the server
    post('/sensors', {'name': name});

    startListening();

    // Refresh the beacons we want periodically
    setInterval(refreshBeacons, 5000);


};

document.getElementById("start").addEventListener("click", start);




 
