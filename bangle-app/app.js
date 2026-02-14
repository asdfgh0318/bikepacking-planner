// Bikepacking Navigator for Bangle.js 2
// Shows arrow pointing to next waypoint + distance

var W = g.getWidth();
var H = g.getHeight();
var CX = W / 2;
var CY = H / 2 + 10;

// State
var route = null;
var wpIdx = 0;
var gpsLat = NaN;
var gpsLon = NaN;
var gpsCourse = NaN;
var gpsFix = false;
var gpsSats = 0;
var totalDist = 0;
var distToWp = 0;
var bearing = 0;

// Load route
function loadRoute() {
  try {
    route = require("Storage").readJSON("bikepack.route.json", true);
  } catch (e) {
    route = null;
  }
  if (route && route.waypoints && route.waypoints.length > 0) {
    wpIdx = 0;
    totalDist = 0;
    // Calculate total route distance
    for (var i = 1; i < route.waypoints.length; i++) {
      totalDist += haversine(
        route.waypoints[i - 1][0], route.waypoints[i - 1][1],
        route.waypoints[i][0], route.waypoints[i][1]
      );
    }
  }
}

// Haversine distance in km
function haversine(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Bearing from point A to point B in degrees
function calcBearing(lat1, lon1, lat2, lon2) {
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  var x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// Draw arrow pointing in direction
function drawArrow(angle, r) {
  var rad = angle * Math.PI / 180;
  var tipX = CX + Math.sin(rad) * r;
  var tipY = CY - Math.cos(rad) * r;
  var leftRad = (angle - 150) * Math.PI / 180;
  var rightRad = (angle + 150) * Math.PI / 180;
  var baseR = r * 0.45;

  g.setColor("#4ade80");
  g.fillPoly([
    tipX, tipY,
    CX + Math.sin(leftRad) * baseR, CY - Math.cos(leftRad) * baseR,
    CX, CY,
    CX + Math.sin(rightRad) * baseR, CY - Math.cos(rightRad) * baseR
  ]);
}

// Format distance nicely
function fmtDist(km) {
  if (km < 1) return (km * 1000).toFixed(0) + "m";
  if (km < 10) return km.toFixed(2) + "km";
  return km.toFixed(1) + "km";
}

// Main draw
function draw() {
  g.clear();
  g.setFontAlign(0, 0);

  if (!route || !route.waypoints || route.waypoints.length === 0) {
    g.setFont("6x8", 2);
    g.setColor("#f87171");
    g.drawString("No Route", CX, CY - 16);
    g.setFont("6x8", 1);
    g.setColor("#94a3b8");
    g.drawString("Send route via", CX, CY + 8);
    g.drawString("web interface", CX, CY + 20);
    return;
  }

  var wp = route.waypoints[wpIdx];

  // Top bar: waypoint info
  g.setFont("6x8", 1);
  g.setColor("#64748b");
  g.drawString((wpIdx + 1) + "/" + route.waypoints.length, CX, 12);

  if (route.name) {
    g.setColor("#94a3b8");
    var name = route.name;
    if (name.length > 20) name = name.substring(0, 18) + "..";
    g.drawString(name, CX, 24);
  }

  if (!gpsFix) {
    // No GPS fix
    g.setFont("6x8", 2);
    g.setColor("#fbbf24");
    g.drawString("GPS...", CX, CY - 8);
    g.setFont("6x8", 1);
    g.setColor("#64748b");
    g.drawString(gpsSats + " sats", CX, CY + 12);
    return;
  }

  // Calculate bearing and distance to current waypoint
  distToWp = haversine(gpsLat, gpsLon, wp[0], wp[1]);
  bearing = calcBearing(gpsLat, gpsLon, wp[0], wp[1]);

  // Arrow: relative to GPS course (if moving) or absolute
  var arrowAngle = bearing;
  if (!isNaN(gpsCourse) && gpsCourse > 0) {
    arrowAngle = bearing - gpsCourse;
  }

  // Draw arrow
  drawArrow(arrowAngle, 45);

  // Distance to next waypoint
  g.setFont("6x8", 3);
  g.setColor("#f1f5f9");
  g.drawString(fmtDist(distToWp), CX, CY + 55);

  // Remaining distance estimate
  var remainDist = 0;
  for (var i = wpIdx; i < route.waypoints.length - 1; i++) {
    if (i === wpIdx) {
      remainDist += distToWp;
    } else {
      remainDist += haversine(
        route.waypoints[i][0], route.waypoints[i][1],
        route.waypoints[i + 1][0], route.waypoints[i + 1][1]
      );
    }
  }

  g.setFont("6x8", 1);
  g.setColor("#64748b");
  g.drawString("remain: " + fmtDist(remainDist), CX, CY + 72);

  // Auto-advance if within 50m of waypoint
  if (distToWp < 0.05 && wpIdx < route.waypoints.length - 1) {
    wpIdx++;
    Bangle.buzz(200);
  }

  // Finished route
  if (wpIdx >= route.waypoints.length - 1 && distToWp < 0.05) {
    g.setFont("6x8", 2);
    g.setColor("#4ade80");
    g.drawString("ARRIVED!", CX, CY);
    Bangle.buzz(500);
  }
}

// GPS handler
Bangle.on('GPS', function (gps) {
  gpsSats = gps.satellites || 0;
  if (gps.fix) {
    gpsFix = true;
    gpsLat = gps.lat;
    gpsLon = gps.lon;
    gpsCourse = gps.course || NaN;
  }
});

// Button: skip to next waypoint
setWatch(function () {
  if (route && wpIdx < route.waypoints.length - 1) {
    wpIdx++;
    Bangle.buzz(100);
  }
}, BTN, { repeat: true, edge: "falling" });

// Init
loadRoute();
Bangle.setGPSPower(1);
Bangle.loadWidgets();
Bangle.drawWidgets();

// Update every second
setInterval(draw, 1000);
draw();
