// Apertium Global Pairviewer
// Colin Pillsbury, Spring 2017
// cpillsb1@swarthmore.edu

var fixedWidth = window.innerWidth,
    fixedHeight = window.innerHeight;

var width = window.innerWidth > window.innerHeight ? window.innerHeight : window.innerWidth;

var visitMap = new Map();

var TRUNK_COLOR = "#5dff0b";
var STAGING_COLOR = "#ffd900";
var NURSERY_COLOR = "#ff5900";
var INCUBATOR_COLOR = "#cc0000";
var UNKNOWN_COLOR = "#9c27b0";

var MARKER_SIZE = "40";

/********* colorbrewing *********/
var maxStems = 100000;
// Forbid the 0-9 category (-1)
var numShades = parseInt(Math.log(maxStems)/Math.LN10) - 1;
var translationClasses = ["trunk","staging","nursery","incubator"];
var goldenYellowScale = {
  4: ["#ffd54c", "#ffc300", "#CC9C00", "#7f6a26"],
  5: ["#FFF199", "#FFEC70", "#E0C200", "#CCB100", "#B89F00",],
  6: ["#FFEC70", "#FFE433", "#E0C200", "#CCB100", "#B89F00", "#A38D00"],
};
var translationClassColourChoices = [
  [colorbrewer.BuGn, colorbrewer.Blues, colorbrewer.YlOrRd, colorbrewer.Greys],
  [colorbrewer.BuGn, colorbrewer.GnBu, colorbrewer.YlOrBr, colorbrewer.PuRd],
  [colorbrewer.YlGn, colorbrewer.Blues, colorbrewer.PuRd, colorbrewer.Greys],
  [colorbrewer.YlGn, colorbrewer.Blues, colorbrewer.PuRd, colorbrewer.OrRd],
  [colorbrewer.YlGn, colorbrewer.YlGnBu, colorbrewer.Oranges, colorbrewer.Reds],
  [colorbrewer.YlGn, goldenYellowScale, colorbrewer.Oranges, colorbrewer.Reds],
];
// Vary only lightness.
var niceGreen = d3.rgb("#0c0"), niceYellow = d3.rgb("#fc0"), niceOrange = d3.rgb("#f60"), niceRed = d3.rgb("#c00");
var temp = [];
[niceGreen, niceYellow, niceOrange, niceRed].forEach(function(c) {
  var tempp = [];
  for (i = 0; i < 5; ++i) {
    tempp.push(c.darker((i - 1)));
  }
  temp.push({5: tempp.reverse()});
});
translationClassColourChoices.push(temp);
// Desaturate
// Actually this has become so complex. A colour theory specialist needs to analyse this.
var temp = [];
[d3.hsl(100, 1, 0.5), d3.hsl(51, 1, 0.5), d3.hsl(21, 1, 0.5), d3.hsl(0, 1, 0.4)].forEach(function(c) {
  var tempp = [];
  for (i = 0; i < 5; ++i) {
    var cc = c.brighter(0);
    if (cc.h == 0) {
      cc.s = cc.s / (i+0.5);
      cc.l = cc.l + 0.3 * Math.sqrt(i);
    }
    else if (cc.h == 100) {
      cc.s = cc.s / (2*i + 1);
      cc.l = cc.l + 0.01 * Math.exp(i + 0.8);
    }
    else {
      cc.s = cc.s / (i+0.5);
      cc.l *= Math.pow(1.22, i);
    }
    tempp.push(cc);
  }
  temp.push({5: tempp.reverse()});
});
translationClassColourChoices.push(temp);
var translationClassColours = translationClassColourChoices[7].map(function(e){return e[numShades + 1].slice(1);});
/********* end of colorbrewing *********/

var proj = d3.geoOrthographic()
    .translate([fixedWidth / 2, fixedHeight / 2])
    .clipAngle(90)
    .scale(width / 4);

var sky = d3.geoOrthographic()
    .translate([fixedWidth / 2, fixedHeight / 2])
    .clipAngle(90)
    .scale(width / 3);


// Point radius can be updated here
var path = d3.geoPath().projection(proj).pointRadius(3);

var swoosh = d3.line()
      .x(function(d) { return d[0] })
      .y(function(d) { return d[1] })
      .curve(d3.curveCardinal.tension(-1.3));


var links = [],
    arcLines = [];

// Defining tooltip
var div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Table used to look up full language names
var codeToLangTable = {};
    d3.json("languages.json", function(error, table) {
        codeToLangTable = jQuery.extend(true, {}, table);
    });

// Currently not using long/lat lines, but can be used by uncommenting and pathing
// var graticule = d3.geo.graticule();

var svg = d3.select("body").append("svg")
  .attr("width", fixedWidth)
  .attr("height", fixedHeight);
svg.style("background", "#311B92");

window.addEventListener("resize", resize);

var zoom = d3.zoom()
    .scaleExtent([100, 50000])
    .on("start",zoomstart)
    .on("zoom", zoomed)
    .on("end",zoomend);

svg.call(zoom);

d3.select("svg").on("dblclick.zoom", null);

function resize() {
  fixedWidth = window.innerWidth;
  fixedHeight = window.innerHeight;
  svg.attr("width", fixedWidth).attr("height", fixedHeight);

  sky = d3.geoOrthographic()
      .translate([fixedWidth / 2, fixedHeight / 2])
      .clipAngle(90)
      .scale(width / 3);

  proj = d3.geoOrthographic()
      .translate([fixedWidth / 2, fixedHeight / 2])
      .clipAngle(90)
      .scale(width / 4);

  path = d3.geoPath().projection(proj).pointRadius(3);

  svg.selectAll("circle").attr("cx", fixedWidth / 2).attr("cy", fixedHeight / 2);

  if(o0) {
    proj.rotate(o0);
    sky.rotate(o0);
  }

  refresh();

  var sidenavHeight = $("#sidenav").css("height");
  var val = parseInt(sidenavHeight.substring(0,sidenavHeight.length-2));
  var offset = 487;
  var total = val - offset >= 0 ? val - offset : 0;
  $("#pointList").css("max-height", (total) + "px");
}

queue()
    .defer(d3.json, "world-110m.json")
    .defer(d3.json, "apertiumPairs.json")
    .defer(d3.json, "apertiumPoints.json")
    .await(ready);

function ready(error, world, places, points) {
  var land = topojson.object(world, world.objects.land),
      borders = topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; });
      // grid = graticule(); currently lat lon lines not used, can uncomment to use

  var ocean_fill = svg.append("defs").append("radialGradient")
        .attr("id", "ocean_fill")
        .attr("cx", "75%")
        .attr("cy", "25%");
      ocean_fill.append("stop").attr("offset", "5%").attr("stop-color", "#82B1FF");
      ocean_fill.append("stop").attr("offset", "100%").attr("stop-color", "#2196F3");

  var drop_shadow = svg.append("defs").append("radialGradient")
        .attr("id", "drop_shadow")
        .attr("cx", "50%")
        .attr("cy", "50%");
      drop_shadow.append("stop")
        .attr("offset","20%").attr("stop-color", "#000")
        .attr("stop-opacity",".5")
      drop_shadow.append("stop")
        .attr("offset","100%").attr("stop-color", "#000")
        .attr("stop-opacity","0")

  var markerDef = svg.append("defs");
  markerDef.append("marker")
        .attr("id", "trunkoneway")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", "2")
        .attr("refY", "2")
        .attr("markerUnits", "userSpaceOnUse")
        .attr("markerWidth", MARKER_SIZE)
        .attr("markerHeight", MARKER_SIZE)
        .attr("orient", "auto")
        .style("fill", TRUNK_COLOR)
        .style("stroke", "black")
        .style("stroke-width", "0.3px")
      .append("path")
        .attr("d", "M 1 1 L 3 2 L 1 3 Z");
  markerDef.append("marker")
        .attr("id", "trunktwoway")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", "2.5")
        .attr("refY", "2")
        .attr("markerUnits", "userSpaceOnUse")
        .attr("markerWidth", MARKER_SIZE)
        .attr("markerHeight", MARKER_SIZE)
        .attr("orient", "auto")
        .style("fill", TRUNK_COLOR)
        .style("stroke", "black")
        .style("stroke-width", "0.3px")
      .append("path")
        .attr("d", "M0 2 L 2 1 L 2 3 L 0 2 M 2.5 1 L 4.5 2 L 2.5 3 L 2.5 1");
  markerDef.append("marker")
        .attr("id", "stagingoneway")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", "2")
        .attr("refY", "2")
        .attr("markerUnits", "userSpaceOnUse")
        .attr("markerWidth", MARKER_SIZE)
        .attr("markerHeight", MARKER_SIZE)
        .attr("orient", "auto")
        .style("fill", STAGING_COLOR)
        .style("stroke", "black")
        .style("stroke-width", "0.3px")
      .append("path")
        .attr("d", "M 1 1 L 3 2 L 1 3 Z");
  markerDef.append("marker")
        .attr("id", "stagingtwoway")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", "2.5")
        .attr("refY", "2")
        .attr("markerUnits", "userSpaceOnUse")
        .attr("markerWidth", MARKER_SIZE)
        .attr("markerHeight", MARKER_SIZE)
        .attr("orient", "auto")
        .style("fill", STAGING_COLOR)
        .style("stroke", "black")
        .style("stroke-width", "0.3px")
      .append("path")
        .attr("d", "M0 2 L 2 1 L 2 3 L 0 2 M 2.5 1 L 4.5 2 L 2.5 3 L 2.5 1");
  markerDef.append("marker")
        .attr("id", "nurseryoneway")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", "2")
        .attr("refY", "2")
        .attr("markerUnits", "userSpaceOnUse")
        .attr("markerWidth", MARKER_SIZE)
        .attr("markerHeight", MARKER_SIZE)
        .attr("orient", "auto")
        .style("fill", NURSERY_COLOR)
        .style("stroke", "black")
        .style("stroke-width", "0.3px")
      .append("path")
        .attr("d", "M 1 1 L 3 2 L 1 3 Z");
  markerDef.append("marker")
        .attr("id", "nurserytwoway")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", "2.5")
        .attr("refY", "2")
        .attr("markerUnits", "userSpaceOnUse")
        .attr("markerWidth", MARKER_SIZE)
        .attr("markerHeight", MARKER_SIZE)
        .attr("orient", "auto")
        .style("fill", NURSERY_COLOR)
        .style("stroke", "black")
        .style("stroke-width", "0.3px")
      .append("path")
        .attr("d", "M0 2 L 2 1 L 2 3 L 0 2 M 2.5 1 L 4.5 2 L 2.5 3 L 2.5 1");
  markerDef.append("marker")
        .attr("id", "incubatoroneway")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", "2")
        .attr("refY", "2")
        .attr("markerUnits", "userSpaceOnUse")
        .attr("markerWidth", MARKER_SIZE)
        .attr("markerHeight", MARKER_SIZE)
        .attr("orient", "auto")
        .style("fill", INCUBATOR_COLOR)
        .style("stroke", "black")
        .style("stroke-width", "0.3px")
      .append("path")
        .attr("d", "M 1 1 L 3 2 L 1 3 Z");
  markerDef.append("marker")
        .attr("id", "incubatortwoway")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", "2.5")
        .attr("refY", "2")
        .attr("markerUnits", "userSpaceOnUse")
        .attr("markerWidth", MARKER_SIZE)
        .attr("markerHeight", MARKER_SIZE)
        .attr("orient", "auto")
        .style("fill", INCUBATOR_COLOR)
        .style("stroke", "black")
        .style("stroke-width", "0.3px")
      .append("path")
        .attr("d", "M0 2 L 2 1 L 2 3 L 0 2 M 2.5 1 L 4.5 2 L 2.5 3 L 2.5 1");

  svg.append("circle")
    .attr("cx", fixedWidth / 2).attr("cy", fixedHeight / 2)
    .attr("r", proj.scale())
    .attr("class", "noclicks")
    .attr("id", "circle1")
    .style("fill", "url(#ocean_fill)");

  svg.append("path")
    .datum(topojson.object(world, world.objects.land))
    .attr("class", "land")
    .attr("d", path).style("fill", "white");

  svg.append("path")
    .datum(borders)
    .attr("class", "mesh")
    .style("stroke", "#808d98") // Border color can be changed here
    .style("fill", "999").style("fill","transparent");

  // LONG AND LAT LINES, need to uncomment other graticule references to use
  // svg.append("path")
  //       .datum(graticule)
  //       .attr("class", "graticule noclicks")
  //       .attr("d", path);


  // Parse default pairs
  places.pairs.forEach(function(a) {
    var s, t;
    for(var pointInd = 0; pointInd < points.point_data.length; pointInd++) {
      if(points.point_data[pointInd].tag === a.lg2) {
        s = points.point_data[pointInd].geometry.coordinates;
      }
      if(points.point_data[pointInd].tag === a.lg1) {
        t = points.point_data[pointInd].geometry.coordinates;
      }
    }
    links.push({
      source: s,
      target: t,
      sourceTag: a.lg2,
      targetTag: a.lg1,
      stage: a.repo,
      stems: a.stems,
      direction: a.direction,
      filtered: "true" // If filtered is true, make flyer visible.
    });
  });

  // build geoJSON features from links array
  links.forEach(function(e,i,a) {
    var feature =  { "type": "Feature", "geometry": { "type": "LineString", "coordinates": [e.source,e.target] }, "stage": e.stage, "sourceTag": e.sourceTag, "targetTag": e.targetTag, "direction": e.direction }
    arcLines.push(feature)
  })

  svg.append("g").attr("class","arcs")
    .selectAll("path").data(arcLines)
    .enter().append("path")
      .attr("class","arc")
      .attr("d",path)
      .attr("stage", function(d) { return d.stage })
      .attr("sourceTag", function(d) { return d.sourceTag })
      .attr("targetTag", function(d) { return d.targetTag })
      .attr("direction", function(d) { return d.direction })

  svg.append("g").attr("class","flyers")
    .selectAll("path").data(links)
    .enter().append("path")
    .attr("class","flyer")
    .attr("sourceTag", function(d) { return d.sourceTag })
    .attr("targetTag", function(d) { return d.targetTag })
    .attr("d", function(d) { return swoosh(flying_arc(d)) })
    .style("stroke", function(d) { return chooseColor(d) })
    .on("mouseover", function(d) { //Hovering over flyers for tooltip
            if(d.filtered === "false") {
              return;
            }
            div.transition()
                .duration(200)
                .style("opacity", .9);
            $(this).css("stroke-width", "4px");
            var arrow = d.direction === "<>" ? "↔" : d.direction === ">" ? "→" : "–";
            var repo = d.stage === undefined ? "Unknown" : d.stage.charAt(0).toUpperCase() + d.stage.slice(1);
            div .html(d.sourceTag + " " + arrow + " " + d.targetTag + "<br/>" + (d.stems === undefined || d.stems === -1 ? "Unknown" : d.stems) + "<br/>" + repo)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
            })
        .on("mouseout", function(d) {
            div.transition()
                .duration(500)
                .style("opacity", 0);
            $(this).css("stroke-width", "2px");
        });

  // Create labels and points AFTER flyers and arcs so they appear above
  svg.append("g").attr("class","labels")
        .selectAll("text").data(points.point_data)
      .enter().append("text")
      .attr("class", "label")
      .attr("coordinate", function(d) {return d.geometry.coordinates})
      .text(function(d) { return d.tag })
      .on("mouseover", function(d) { //Hovering over labels for tooltip
            if($(this).css("opacity") === "0") {
              return;
            }
            div.transition()
                .duration(200)
                .style("opacity", .9);

            div	.html(d.tag + "<br/>" + codeToLanguage(d.tag)) // Looking up full name
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
            })
        .on("mouseout", function(d) {
            div.transition()
                .duration(500)
                .style("opacity", 0);
        });

  svg.append("g").attr("class","points")
      .selectAll("text").data(points.point_data)
    .enter().append("path")
      .attr("class", "point")
      .attr("d", path)
      .attr("coordinate", function(d) {return d.geometry.coordinates})
      .attr("tag", function(d) { return d.tag })
      .on("mouseover", function(d) { //Also added hovering over points for tooltip
            if($(this).css("opacity") === "0") {
              return;
            }
            div.transition()
                .duration(200)
                .style("opacity", .9);

            div	.html(d.tag + "<br/>" + codeToLanguage(d.tag))
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
            })
        .on("mouseout", function(d) {
            div.transition()
                .duration(500)
                .style("opacity", 0);
        });

  // Populate the filter point list
  var alphaPointList = [];
  for(var i = 0; i < points.point_data.length; i++) {
    alphaPointList.push(points.point_data[i].tag);
  }
  alphaPointList.sort();
  for(var i = 0; i < alphaPointList.length; i++) {
    var newPoint = $("<a>")
      .attr("id", "point" + alphaPointList[i])
      .attr("class", "dropdown-select")
      .attr("onclick", "filterPoint('" + alphaPointList[i] + "')")
      .text(alphaPointList[i])
    $("#pointList").append(newPoint);
  }

  refresh();
  handleUnusedPoints();
}

//Position and hiding labels
function position_labels() {
  var centerPos = proj.invert([fixedWidth/2, fixedHeight/2]);

  svg.selectAll(".label")
    .attr("label-anchor",function(d) {
      var x = proj(d.geometry.coordinates)[0];
      return x < width/2-20 ? "end" :
             x < width/2+20 ? "middle" :
             "start"
    })
    .attr("transform", function(d) {
      var loc = proj(d.geometry.coordinates),
        x = loc[0],
        y = loc[1];
      var offset = x < width/2 ? -5 : 5;
      return "translate(" + (x+offset) + "," + (y-2) + ")"
    })
    .style("display",function(d) {
      var d = d3.geoDistance(d.geometry.coordinates, centerPos);
      return (d > 1.57) ? 'none' : 'inline';
    })

}

// Chooses flyer color based on language pair stage
// trunk green, staging yellow, nursery orange, incubator red
function chooseColor(d) {
  if($("#colorStemCheckbox").prop("checked") === false) {
    if (d.stage == "trunk") {
      return TRUNK_COLOR;
    }
    else if (d.stage == "staging") {
      return STAGING_COLOR;
    }
    else if (d.stage == "nursery") {
      return NURSERY_COLOR;
    }
    else if (d.stage == "incubator") {
      return INCUBATOR_COLOR;
    }
    else {
      return UNKNOWN_COLOR;
    }
  }
  if(d.stems === undefined || d === -1) {
    return UNKNOWN_COLOR;
  }
  try {
    // Even if d.stems is a non-numerical String, it does not throw an error...
    if (isNaN(Math.log(d.stems))) {
      throw new Error("Node has unknown stem count");
    }
    // Shunt <= 99 to colour 0
    return d3.scaleOrdinal()
      .domain(translationClasses)
      .range(translationClassColours)
      (d.stage)[ ((d.stems <= 99) ? 0 : parseInt(Math.log(d.stems)/Math.LN10) - 1) ];
    }
  catch (e) {
    // Give it the lightest colour if the stem count is unknown
    return d3.scaleOrdinal()
      .domain(translationClasses)
      .range(translationClassColours)
      (d.stage)[0];
   }
}

function flying_arc(pts) {
  var source = pts.source,
      target = pts.target;

  var mid = location_along_arc(source, target, .5);
  var result = [ proj(source),
                 sky(mid),
                 proj(target)]

  return result;
}

function codeToLanguage(code) {
    // Presuming that it is in fact a three-letter terminological code
    if (codeToLangTable[code] === undefined) {
        return "Unknown";
    }
    return codeToLangTable[code];
}


function refresh() {
  svg.selectAll(".land").attr("d", path);
  svg.selectAll(".point").attr("d", path);
  svg.selectAll(".mesh").attr("d", path);
  svg.selectAll(".arc").attr("d", path);
  // svg.selectAll(".graticule").attr("d", path); //This adds long and lat lines

  position_labels();

  svg.selectAll(".flyer")
    .attr("d", function (d) { return swoosh(flying_arc(d)) })
    .attr("marker-mid", function (d) {return addMarker(d)})
    .attr("opacity", function (d) {
      return fade_at_edge(d)
    });
}

function addMarker(d) {
  if(d.direction === "<>") {
    return "url(#" + d.stage + "twoway)";
  }
  else if (d.direction === ">") {
    return "url(#" + d.stage + "oneway)";
  }
  else {
    return "";
  }
}

function fade_at_edge(d) {
  if(d.filtered === "false") {
      return 0;
  }

  var centerPos = proj.invert([fixedWidth / 2, fixedHeight / 2]),
      start, end;
  // function is called on 2 different data structures..
  if (d.source) {
    start = d.source,
    end = d.target;
  }
  else {
    start = d.coordinates1;
    end = d.coordinates2;
  }

  var start_dist = 1.57 - d3.geoDistance(start, centerPos),
      end_dist = 1.57 - d3.geoDistance(end, centerPos);

  var fade = d3.scaleLinear().domain([-.1,0]).range([0,.1])
  var dist = start_dist < end_dist ? start_dist : end_dist;
  return fade(dist)
}

function location_along_arc(start, end, loc) {
  var interpolator = d3.geoInterpolate(start,end);
  return interpolator(loc)
}

function rotateToPoint(p) {
  var rotate = proj.rotate();
  var coords;
  for(var i = 0; i < svg.selectAll(".point")._groups[0].length; i++) {
    if(svg.selectAll(".point")._groups[0][i].getAttribute("tag") === p) {
      coords = svg.selectAll(".point")._groups[0][i].getAttribute("coordinate");
    }
  }
  var q = coords.split(',');
  d3.transition().duration(2500).tween("rotate", function() {
    var r = d3.interpolate(proj.rotate(), [-parseInt(q[0]), -parseInt(q[1]), rotate[2]]);
    return function(t) {
      proj.rotate(r(t));
      sky.rotate(r(t));
      o0 = proj.rotate();
      refresh();
    }
  })
}

// modified from http://bl.ocks.org/tlfrd/df1f1f705c7940a6a7c0dca47041fec8
var o0;

/********** versor.js **********/
var acos = Math.acos,
    asin = Math.asin,
    atan2 = Math.atan2,
    cos = Math.cos,
    max = Math.max,
    min = Math.min,
    PI = Math.PI,
    sin = Math.sin,
    sqrt = Math.sqrt,
    radians = PI / 180,
    degrees = 180 / PI;

// Returns the unit quaternion for the given Euler rotation angles [λ, φ, γ].
function versor(e) {
  var l = e[0] / 2 * radians, sl = sin(l), cl = cos(l), // λ / 2
      p = e[1] / 2 * radians, sp = sin(p), cp = cos(p), // φ / 2
      g = e[2] / 2 * radians, sg = sin(g), cg = cos(g); // γ / 2
  return [
    cl * cp * cg + sl * sp * sg,
    sl * cp * cg - cl * sp * sg,
    cl * sp * cg + sl * cp * sg,
    cl * cp * sg - sl * sp * cg
  ];
}

// Returns Cartesian coordinates [x, y, z] given spherical coordinates [λ, φ].
versor.cartesian = function(e) {
  var l = e[0] * radians, p = e[1] * radians, cp = cos(p);
  return [cp * cos(l), cp * sin(l), sin(p)];
};

// Returns the Euler rotation angles [λ, φ, γ] for the given quaternion.
versor.rotation = function(q) {
  return [
    atan2(2 * (q[0] * q[1] + q[2] * q[3]), 1 - 2 * (q[1] * q[1] + q[2] * q[2])) * degrees,
    asin(max(-1, min(1, 2 * (q[0] * q[2] - q[3] * q[1])))) * degrees,
    atan2(2 * (q[0] * q[3] + q[1] * q[2]), 1 - 2 * (q[2] * q[2] + q[3] * q[3])) * degrees
  ];
};

// Returns the quaternion to rotate between two cartesian points on the sphere.
versor.delta = function(v0, v1) {
  var w = cross(v0, v1), l = sqrt(dot(w, w));
  if (!l) return [1, 0, 0, 0];
  var t = acos(max(-1, min(1, dot(v0, v1)))) / 2, s = sin(t); // t = θ / 2
  return [cos(t), w[2] / l * s, -w[1] / l * s, w[0] / l * s];
};

// Returns the quaternion that represents q0 * q1.
versor.multiply = function(q0, q1) {
  return [
    q0[0] * q1[0] - q0[1] * q1[1] - q0[2] * q1[2] - q0[3] * q1[3],
    q0[0] * q1[1] + q0[1] * q1[0] + q0[2] * q1[3] - q0[3] * q1[2],
    q0[0] * q1[2] - q0[1] * q1[3] + q0[2] * q1[0] + q0[3] * q1[1],
    q0[0] * q1[3] + q0[1] * q1[2] - q0[2] * q1[1] + q0[3] * q1[0]
  ];
};

function cross(v0, v1) {
  return [
    v0[1] * v1[2] - v0[2] * v1[1],
    v0[2] * v1[0] - v0[0] * v1[2],
    v0[0] * v1[1] - v0[1] * v1[0]
  ];
}

function dot(v0, v1) {
  return v0[0] * v1[0] + v0[1] * v1[1] + v0[2] * v1[2];
}

/********** end of versor.js **********/

var v0,r0,q0;

window.addEventListener('touchmove',
  function (e) {
    e.preventDefault();
  }
, false);

// Zooms by twice or half
function zoomIn() {
  svg.transition()
    .duration(500)
    .call(zoom.scaleBy, 2);
}

function zoomOut() {
  svg.transition()
    .duration(500)
    .call(zoom.scaleBy, 0.5);
}

// Start off zoomed based off of window size
resetZoom();

function zoomstart() {
  if (d3.event.sourceEvent) {
    v0 = versor.cartesian(proj.invert(d3.mouse(this)));
    r0 = proj.rotate();
    q0 = versor(r0);
  }
}

function zoomed() {
  var scale = d3.event.transform.k;
  if(width === scale) {
    // If not zooming, rotating.
    var v1 = versor.cartesian(proj.rotate(r0).invert(d3.mouse(this)));
    var q1 = versor.multiply(q0, versor.delta(v0, v1));
    var r1 = versor.rotation(q1);
    proj.rotate(r1);
    sky.rotate(r1);
    refresh();
  }
  else {
    width = scale;

    proj = d3.geoOrthographic()
      .translate([fixedWidth / 2, fixedHeight / 2])
      .clipAngle(90)
      .scale(scale / 4);

    sky = d3.geoOrthographic()
      .translate([fixedWidth / 2, fixedHeight / 2])
      .clipAngle(90)
      .scale(scale / 3);

    path = d3.geoPath().projection(proj).pointRadius(3);

    svg.selectAll("circle").attr("r", scale / 4);

    if(o0) {
      proj.rotate(o0);
      sky.rotate(o0);
    }

    refresh();
  }
}

function zoomend() {
  o0 = proj.rotate();
}

// Resets zoom to fit window size
function resetZoom() {
  var initial = 2;
  svg.transition()
    .call(zoom.transform, d3.zoomIdentity.scale(Math.min(initial*fixedHeight,initial*fixedWidth)));
}

// Zoom-in with + key and zoom-out with - key and reset with 0
window.onkeydown = function(e) {
  if (navigator.userAgent.search("Chrome") >= 0) {
    if(e.keyCode === 187) {
      e.preventDefault();
      zoomIn();
    }
    if(e.keyCode === 189) {
      e.preventDefault();
      zoomOut();
    }
    if(e.keyCode === 48) {
      e.preventDefault();
      resetZoom();
    }
  }
  else if (navigator.userAgent.search("Firefox") >= 0) {
    if(e.keyCode === 61) {
      e.preventDefault();
      zoomIn();
    }
    if(e.keyCode === 173) {
      e.preventDefault();
      zoomOut();
    }
    if(e.keyCode === 48) {
      e.preventDefault();
      resetZoom();
    }
  }
};
