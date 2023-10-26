let map;
var currentMarkers = [];
var gridOriginLat = 0;
var gridOriginLng = 0;
var xScalingFactor = 0;
var yScalingFactor = 0;

const startInput = {
    points: [
        {
            type: "abs",
            name: "westcorner",
            label: "a",
            lat: -37.807118,
            lng: 144.969083
        },
        {
            type: "abs",
            name: "eastcorner",
            label: "b",
            lat: -37.807545,
            lng: 144.973094
        },
        {
            type: "calc",
            name: "fountain",
            label:"1",
            color: "red",
            take: 1,
            refs: [
                {
                    from: "westcorner",
                    dist: 275.3
                },
                {
                    from: "eastcorner",
                    dist: 278.3
                }
            ]
        }
    ]
};

async function initMap() {
    const { Map, Polyline } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    const { spherical } = await google.maps.importLibrary("geometry");


    map = new Map(document.getElementById("map"), {
        center: { lat: -37.806420, lng: 144.971222 },
        zoom: 18,
        mapId: "mainMap"
    });

    document.getElementById("codeInput").value = JSON.stringify(startInput, null, 2);

    updatePoints();

    document.getElementById("btnUpdate").addEventListener("click", updatePoints);

    function updatePoints() {
        clearMap();
        const input = JSON.parse(document.getElementById("codeInput").value);
    
        if(input.points.length > 0) {
            convertToGrid(input.points.filter(pnt => pnt.type == "abs"));
        }

        input.points.forEach(pnt => {
            if(pnt.type == "abs") {
                addPoint(pnt);
            } else if(pnt.type == "calc") {
                var pntPos = calcPoint(input.points.filter(it => it.type == "abs" || it.type == "calc"), pnt);
                if(pntPos) {
                    addPoint(pnt);
                }
            } else if(pnt.type == "line") {
                buildLine(input.points.filter(it => it.type == "abs" || it.type == "calc"), pnt);
            } else if(pnt.type == "debug:distance") {
                debugDistance(input.points.filter(it => it.type == "abs" || it.type == "calc"), pnt);
            } else if(pnt.type == "label") {
                addLabel(pnt);
            }
        });

        console.log(input.points);
    }
    
    function clearMap() {
        currentMarkers.forEach(m => m.setMap(null));
        currentMarkers = [];
    }
    
    function addPoint(point) {
        if(point.show === undefined || point.show) {
            const content = document.createElement("div");
            content.style.border = `1px solid ${point.color || "black"}`;
            content.style.borderRadius = "20px";
            content.style.width = "20px";
            content.style.height = "20px";
            content.style.transform = "translate(0,50%)"
            content.innerText = point.label || "";
            content.style.color = "black";
            content.classList.add("map-point");
            content.style.display = "flex";
            content.style.justifyContent = "center";
            content.style.alignItems = "center";
            
            const marker = new AdvancedMarkerElement({
                map: map,
                position: { lat: point.lat, lng: point.lng},
                title: point.tag,
                content: content
            });
            currentMarkers.push(marker);
        }
    }

    function addLabel(point) {
        if(point.show === undefined || point.show) {
            const content = document.createElement("div");
            content.style.transform = "translate(0,50%)"
            content.innerText = point.text || "";
            content.style.color = "black";
            content.style.fontSize = "16px";

            const marker = new AdvancedMarkerElement({
                map: map,
                position: { lat: point.lat, lng: point.lng},
                title: point.text,
                content: content
            });
            currentMarkers.push(marker);
        }
    }

    function buildLine(allPoints, line) {
        addLine(
            line.path.map(ref => allPoints.filter(it => it.name == ref)[0]),
            line.color
        );
    }

    function addLine(points, color) {
        const path = points.map(p => {
            if(p.lat === undefined || p.lng === undefined) {
                console.log(`Error, drawing points must be solvable and if they are calculated points must appear before the refering point in the list`);
                return null;
            }
            return { lat: p.lat, lng: p.lng };
        }).filter(it => it !== null);

        const line = new Polyline({
            path: path,
            geodesic: true,
            strokeColor: color || "black",
            strokeOpacity: 1.0,
            strokeWeight: 2,
          });

        line.setMap(map);
        currentMarkers.push(line);
    }

    function calcPoint(allPoints, calcPoint) {
        if(calcPoint.refs.length < 2) {
            console.log(`Error, point ${calcPoint.name} has too few reference points`);
            return null;
        }
        var ref1 = allPoints.filter(p => p.name == calcPoint.refs[0].from)[0];
        var ref2 = allPoints.filter(p => p.name == calcPoint.refs[1].from)[0];
        
        if(!ref1 || !ref2) {
            console.log(`Unable to find all reference points for ${calcPoint.name}`);
            return null;
        }
        if(ref1.x == undefined || ref1.y == undefined || ref2.x == undefined || ref2.y == undefined) {
            console.log("Reference points must be solvable and if they are calculated points must appear before the refering point in the list");
            return null;
        }
        var intersectionPoints = intersection(ref1.x, ref1.y, calcPoint.refs[0].dist, ref2.x, ref2.y, calcPoint.refs[1].dist);
        if(!intersectionPoints) {
            console.log(`Reference points for ${calcPoint.name} don't overlap`);
            return false;
        }
        var result = intersectionPoints[calcPoint.take];
        calcPoint.x = result[0];
        calcPoint.y = result[1];
        var geoResult = convertToGeo(result[0], result[1]);
        calcPoint.lat = geoResult.lat;
        calcPoint.lng = geoResult.lng;
        return geoResult;
    }

    function convertToGrid(absPoints) {
        gridOriginLat = max(absPoints.map(p => p.lat));
        gridOriginLng = min(absPoints.map(p => p.lng));
        var gridEndLat = min(absPoints.map(p => p.lat));
        var gridEndLng = max(absPoints.map(p => p.lng));
        var distY = spherical.computeDistanceBetween({ lat: gridOriginLat, lng: gridOriginLng }, { lat: gridEndLat, lng: gridOriginLng });
        var distX = spherical.computeDistanceBetween({ lat: gridOriginLat, lng: gridOriginLng }, { lat: gridOriginLat, lng: gridEndLng });
        var dLat = gridOriginLat - gridEndLat;
        var dLng = gridEndLng - gridOriginLng;
        xScalingFactor = distX / dLng;
        yScalingFactor = distY / dLat;

        absPoints.forEach(pnt => {
            var gridLat = gridOriginLat - pnt.lat;
            var gridLng = pnt.lng - gridOriginLng;
            pnt.x = gridLng * xScalingFactor;
            pnt.y = gridLat * yScalingFactor;
        });
    }

    function convertToGeo(x, y) {
        return { lat: gridOriginLat - (y / yScalingFactor), lng: gridOriginLng + (x / xScalingFactor) };
    }

    function debugDistance(allPoints, obj) {
        var pnt1 = allPoints.filter(it => it.name == obj.pnt1)[0];
        var pnt2 = allPoints.filter(it => it.name == obj.pnt2)[0];
        if(!pnt1 || !pnt2) {
            console.log("Error: unable to find one or both points to measure distance");
            return;
        }
        if(pnt1.lat == undefined || pnt1.lng == undefined || pnt2.lat == undefined || pnt2.lng == undefined) {
            console.log("Reference points must be solvable and if they are calculated points must appear before the refering point in the list");
            return;
        }
        console.log(`Distance between ${pnt1.name} and ${pnt2.name}: ${spherical.computeDistanceBetween({ lat: pnt1.lat, lng: pnt1.lng }, { lat: pnt2.lat, lng: pnt2.lng })} meters`);
    }
}

function intersection(x0, y0, r0, x1, y1, r1) {
    var a, dx, dy, d, h, rx, ry;
    var x2, y2;

    /* dx and dy are the vertical and horizontal distances between
     * the circle centers.
     */
    dx = x1 - x0;
    dy = y1 - y0;

    /* Determine the straight-line distance between the centers. */
    d = Math.sqrt((dy*dy) + (dx*dx));

    /* Check for solvability. */
    if (d > (r0 + r1)) {
        /* no solution. circles do not intersect. */
        console.log("No solution circles do not intersect");
        return null;
    }
    if (d < Math.abs(r0 - r1)) {
        /* no solution. one circle is contained in the other */
        console.log("No solution one circle in contained within the other");
        return null;
    }

    /* 'point 2' is the point where the line through the circle
     * intersection points crosses the line between the circle
     * centers.  
     */

    /* Determine the distance from point 0 to point 2. */
    a = ((r0*r0) - (r1*r1) + (d*d)) / (2.0 * d) ;

    /* Determine the coordinates of point 2. */
    x2 = x0 + (dx * a/d);
    y2 = y0 + (dy * a/d);

    /* Determine the distance from point 2 to either of the
     * intersection points.
     */
    h = Math.sqrt((r0*r0) - (a*a));

    /* Now determine the offsets of the intersection points from
     * point 2.
     */
    rx = -dy * (h/d);
    ry = dx * (h/d);

    /* Determine the absolute intersection points. */
    var xi = x2 + rx;
    var xi_prime = x2 - rx;
    var yi = y2 + ry;
    var yi_prime = y2 - ry;

    return [[xi, yi], [xi_prime, yi_prime]];
}

initMap();

function min(lst) {
    if(lst.length == 0) {
        return null;
    }

    var min = lst[0];
    lst.forEach(v => {
        if(v < min) {
            min = v;
        }
    });
    return min;
}

function max(lst) {
    if(lst.length == 0) {
        return null;
    }

    var max = lst[0];
    lst.forEach(v => {
        if(v > max) {
            max = v;
        }
    });
    return max;
}
