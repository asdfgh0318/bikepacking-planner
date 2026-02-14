# Bikepacking Nav for Bangle.js 2

Waypoint-based navigation for bikepacking. Shows an arrow pointing to the next waypoint with distance remaining.

## Features

- Arrow navigation pointing to next waypoint
- Distance to current waypoint + total remaining
- Auto-advance when within 50m of waypoint
- Buzzes on waypoint arrival
- Button press to skip to next waypoint
- GPX import via web interface
- Manual waypoint entry

## Usage

1. Open the web interface (interface.html) in Chrome/Edge
2. Import a GPX file or paste waypoints
3. Click "Send to Watch" and pair with your Bangle.js 2
4. The route is saved to watch storage and navigation starts

## Route Format

Routes are stored as JSON on the watch:

```json
{
  "name": "My Route",
  "waypoints": [
    [50.0614, 19.9372],
    [49.2990, 19.9490]
  ]
}
```

## Sending from the Bikepacking Planner web app

The main web app can also send routes directly to the watch via Web Bluetooth.

## Battery Notes

GPS uses significant battery. Expect ~5-6 hours of continuous navigation.
Consider using the watch's power saving GPS mode for longer trips.
