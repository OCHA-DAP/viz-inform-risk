var colors = {
  "INFORM RISK": ["#ffe6e3","#e85945", "#911200", '#730d00'],
  "HAZARD & EXPOSURE": ['#fff3e4', '#ffb148', '#ba6a00', '#945400'],
  "VULNERABILITY": ['#e7ecf3', '#789cd5', '#36578b', '#1b3c72'],
  "LACK OF COPING CAPACITY": ['#e6eae2', '#94ad70', '#506236', '#34461b']
}

var colorSchemes = {

  "INFORM RISK": d3.scale.linear()
  		.domain([0, 4, 8, 10])
  		.range([colors["INFORM RISK"][0], colors["INFORM RISK"][1], colors["INFORM RISK"][2], colors["INFORM RISK"][3]])
  		.interpolate(d3.interpolateLab),

  "HAZARD & EXPOSURE": d3.scale.linear()
  		.domain([0, 4, 8, 10])
  		.range([colors["HAZARD & EXPOSURE"][0], colors["HAZARD & EXPOSURE"][1], colors["HAZARD & EXPOSURE"][2], colors["HAZARD & EXPOSURE"][3]])
  		.interpolate(d3.interpolateLab),

  "VULNERABILITY": d3.scale.linear()
  		.domain([0, 4, 8, 10])
  		.range([colors["VULNERABILITY"][0], colors["VULNERABILITY"][1], colors["VULNERABILITY"][2], colors["VULNERABILITY"][3]])
  		.interpolate(d3.interpolateLab),

  "LACK OF COPING CAPACITY": d3.scale.linear()
  		.domain([0, 4, 8, 10])
  		.range([colors["LACK OF COPING CAPACITY"][0], colors["LACK OF COPING CAPACITY"][1], colors["LACK OF COPING CAPACITY"][2], colors["LACK OF COPING CAPACITY"][3]])
  		.interpolate(d3.interpolateLab)

}
var selectedCategory = "INFORM RISK";

function updateColorScheme() {
}

// Generate legend
var legend = d3.select("#legend");

var createLegend = function() {
  d3.selectAll('.legendBlock').remove()
  for (var i = 0; i < 10; i++) {
    legend
      .append("div")
        .attr("class", "legendBlock")
        .style("background-color", colorSchemes[selectedCategory](i));
  }
}
createLegend();

// Hard code staring points
var selectedMetric = "INFORM RISK";
var selectedCountry = "";
//test//var selectedCountry = "Somalia";

var selectedMetricIndex = findIndex(fieldHierarchy, "field", selectedMetric);

var generateSVG = function() {

  //if(svg) { svg.remove(); }
  d3.select("#svg").selectAll("svg").remove();

  // Visual variables
  width = document.getElementById("svg").clientWidth * 2,
  height = document.getElementById("svg").clientHeight * 0.9,
  tau = 2 * Math.PI,
  inner = height / 3.4,
  outer = height / 1.9;

  // Create the SVG container, and apply a transform such that the origin is the center of the canvas
  svg = d3.select("#svg").append("svg")
      .attr("width", width / 2)
      .attr("height", height * 1.1)
    .append("g")
      .attr("transform", "translate(" + width / 4 + "," + height / 1.8 + ")");

  // Create and svg grouping to hold our visualization arcs
  backgroundArcGroup = svg.append("g");
  arcGroup = svg.append("g");
  textArcGroup = svg.append("g");

}
generateSVG();

// Empty arrays
var visibleFields = [];
var visibleArcs = [];
var backgroundArcs = [];
var textArcs = [];

// Add all fields that should be currently represented with arcs to the visibleFields array
var populateVisibleFields = function() {
  visibleFields = fieldHierarchy[selectedMetricIndex].subset;
}
populateVisibleFields();

// A function that, given a metric name, returns the parent metric
var parentMetric = function(metric) {
  for (var i = 0; i < fieldHierarchy.length; i++) {
    for (var j = 0; j < fieldHierarchy[i].subset.length; j++) {
      if (fieldHierarchy[i].subset[j] === metric) {
        return fieldHierarchy[i].field;
      }
    }
  }
}

// Load data
queue()
    .defer(d3.csv, "INFORM-2016.csv")
    .await(ready);

// READY
function ready(error, risk) {
  if (error) throw error;

  populateRankings(risk);

  /////////
  // MAP //
  /////////

  // Add map
  L.mapbox.accessToken = 'pk.eyJ1IjoiYWFyb25kZW5uaXMiLCJhIjoiem5LLURoYyJ9.T3tswGTI5ve8_wE-a02cMw';
  var map = L.mapbox.map('map', 'mapbox.high-contrast',
                          { zoomControl: false,
                            tileLayer: {
                                continuousWorld: false,
                                noWrap: true
                            },
                            maxZoom: 7,
                            center: [0, 0],
                            zoom: 2
                          });

  var choroplethLayer = L.geoJson().addTo(map);

  function onEachFeature(feature, layer) {
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: clickedCountry
        });
  }

  function highlightFeature(e) {

    e.target.setStyle({ fillOpacity: 0.4 });

    //clickedLayer.setStyle({ weight: 6 });

  }

  function resetHighlight(e) {

    e.target.setStyle({ fillOpacity: 0.8 });

  }

  var clickedLayer = undefined;

  // Zooming map to country
  function clickedCountry(e) {

    clickedLayer = e.target;

    d3.select(".instructions").remove();
    selectCountry(risk[findIndex(risk, "ISO3", e.target.feature.properties.ISO3)]["COUNTRY"]);
    map.fitBounds(e.target);

  }

  // Color the map based on metric
  function colorMap() {

    map.removeLayer(choroplethLayer);

    choroplethLayer = L.geoJson(countriesData,  {
        style: getStyle,
        onEachFeature: onEachFeature
    }).addTo(map);

  }

  // function that styles layer
  function getStyle(feature) {
      return {
          weight: getWeight(feature),
          color: "#000",
          fillOpacity: 0.8,
          fillColor: getColor(feature),
      };
  }

  function getWeight(feature) {
    if (feature.properties.ISO3 === getISO3(risk, selectedCountry)) {
      return 6;
    } else {
      return 0;
    }
  }

  function getColor(feature) {
    var iso3Value = (feature.properties.ISO3);
    var theValue = parseFloat(getValue(risk, "ISO3", iso3Value));
    if (theValue) {
      return colorSchemes[selectedCategory](theValue);
    } else {
      return "#aaa";
    }
  }

  // Respond to a country selection
  var selectCountry = function(countryName) {

    selectedCountry = countryName;
    selectedCountryIndex = findIndex(risk, "COUNTRY", selectedCountry);

    // Response functions
    generateSVG();
    displayArcs();
    displayCountryText();
    displayMetricText();

    d3.select("#close-x").attr("class", "active").on("click", resetCountrySelection);

    colorMap();

  }

  // Respond to a metric selection
  var selectMetric = function(metricName) {

    switch (metricName) {
      case "INFORM RISK":
        selectedCategory = "INFORM RISK";
        break;
      case "HAZARD & EXPOSURE":
        selectedCategory = "HAZARD & EXPOSURE";
        break;
      case "VULNERABILITY":
        selectedCategory = "VULNERABILITY";
        break;
      case "LACK OF COPING CAPACITY":
        selectedCategory = "LACK OF COPING CAPACITY";
        break;
    }

    updateColorScheme();

    createLegend();

    selectedMetric = metricName;
    selectedMetricIndex = findIndex(fieldHierarchy, "field", selectedMetric);

    // Response functions
    colorMap();
    rank(risk);

    if(selectedCountry !== "") {
      displayArcs();
      displayMetricText();
    }

  }
  selectMetric("INFORM RISK");

  // Displaying arcs
  function displayArcs() {

    populateVisibleFields();

    backgroundArcGroup.selectAll("path").remove();
    arcGroup.selectAll("path").remove();
    textArcGroup.selectAll("path").remove();
    textArcGroup.selectAll("textPath").remove();
    textArcGroup.selectAll("text").remove();

    generateArcs();

  }

  // Populate country text fields
  function displayCountryText() {

    var title = d3.select("#countryTitle");
    title.text(selectedCountry);

  }

  // Populate metric text fields
  function displayMetricText() {

      selectedMetricValue = risk[selectedCountryIndex][selectedMetric] === "null" ? "no estimation" : Math.round(risk[selectedCountryIndex][selectedMetric] * 10) / 10;

      d3.select("#thisMetric").style("font-weight", "900").text(
        selectedMetric.toUpperCase() + ": "
      ).append("span").text(padDecimal(selectedMetricValue));

      document.getElementById("countryRankingLabel")
        .innerHTML = "Ranks " + risk[selectedCountryIndex]["Rank"] + " out of " + rankings.GLOBE.length + ".";

      if (parentMetric(selectedMetric)) {

        d3.select("#back-button").attr("class", "active").on("click", function() {

          if (parentMetric(selectedMetric)) {
            selectedMetric = parentMetric(selectedMetric);
            selectMetric(selectedMetric);
          }

        });

        d3.select("#thisMetricParent").text(
          parentMetric(selectedMetric).toUpperCase() + ": "
        ).append("span").style("font-weight", "bold").text(padDecimal(Math.round(risk[selectedCountryIndex][parentMetric(selectedMetric)] * 10) / 10));

        d3.select("#thisMetricParent").on("click", function() {
          selectedMetric = parentMetric(selectedMetric);
          selectMetric(selectedMetric);
        });

      } else {

        d3.select("#thisMetricParent").text("");
        d3.select("#back-button").attr("class", "inactive");

      }

      if (parentMetric(parentMetric(selectedMetric))) {
        d3.select("#thisMetricParentParent").text(
          parentMetric(parentMetric(selectedMetric)).toUpperCase() + ": "
        ).append("span").style("font-weight", "bold").text(padDecimal(Math.round(risk[selectedCountryIndex][parentMetric(parentMetric(selectedMetric))] * 10) / 10));

        d3.select("#thisMetricParentParent").on("click", function() {

          selectedMetric = parentMetric(parentMetric(selectedMetric));
          selectMetric(selectedMetric);

        });
      } else {
        d3.select("#thisMetricParentParent").text("");
      }

      if (parentMetric(parentMetric(parentMetric(selectedMetric)))) {
        d3.select("#thisMetricParentParentParent").text(
          parentMetric(parentMetric(parentMetric(selectedMetric))).toUpperCase() + ": "
        ).append("span").style("font-weight", "bold").text(padDecimal(Math.round(risk[selectedCountryIndex][parentMetric(parentMetric(selectedMetric))] * 10) / 10));

        d3.select("#thisMetricParentParentParent").on("click", function() {

          selectedMetric = parentMetric(parentMetric(parentMetric(selectedMetric)));
          selectMetric(selectedMetric);

        });
      } else {
        d3.select("#thisMetricParentParentParent").text("");
      }

  }


  //////////////////////
  // Helper functions //
  //////////////////////

  // Creates an svg arc that can be added to the svgContainer
  function svgArc(inner, outer, start, end) {
    return d3.svg.arc().innerRadius(inner).outerRadius(outer).startAngle(start + tau / 2).endAngle(end + tau / 2);
  }

  // Fill visibleArcs array with new arcs based on visibleFields array and selectedCountryIndex
  function generateArcs() {

    visibleArcs = [];
    backgroundArcs = [];
    textArcs = [];

    var arcWidth = (outer - inner) / visibleFields.length;

    for (var i = 0; i < visibleFields.length; i++) {

      // Gray background arcs
      var newBackgroundArc = svgArc(inner + 2 + (i * arcWidth),
                                    inner - 2 + (i + 1) * arcWidth,
                                    0.002 * tau,
                                    tau);

      backgroundArcs.push(newBackgroundArc);

      backgroundArcGroup.append("path")
          .style("fill", "#9f9fa3")
          .attr("d", backgroundArcs[i])
          .attr("id", visibleFields[i] + " arc")
          .style("cursor", "pointer")
          .style("pointer-events", "pointer")
          .on("mouseover", function(d) {
              d3.select(this).style("stroke", "yellow");
            })
          .on("mouseout", function(d) {
              d3.select(this).style("stroke", "#fff");
            })
          .on("click", function(d) {
              var id = this.getAttribute('id');
              selectMetric(id.substring(0, id.length - 4))
            });

      // Visible red arcs
      var theValue = parseFloat(risk[selectedCountryIndex][visibleFields[i]]);
      var theText = Math.round(risk[selectedCountryIndex][visibleFields[i]] * 10) / 10;
      if (theText.toString().indexOf('.') == -1) theText += '.0';

      var color = {};

      if (colorSchemes.hasOwnProperty(visibleFields[i])) {
        color = colorSchemes[visibleFields[i]];
      } else {
        var color = colorSchemes[selectedCategory];
      }


      if ( isNaN(theValue) ) {
        theValue = 0;
        theText = "no estimate";
      }

      var newArc = svgArc(inner + 1 + (i * arcWidth),
                          inner - 1 + (i + 1) * arcWidth,
                          0.002 * tau,
                          (theValue / 10) * tau)

      visibleArcs.push(newArc);

      arcGroup.append("path")
          .style("fill", color(theValue))
          .style("cursor", "pointer")
          .attr("class", "arc")
          .attr("d", visibleArcs[i])
          .attr("id", visibleFields[i] + " arc")
          .on("mouseover", function(d) {
              var id = this.getAttribute('id');
              theValue = parseFloat(risk[selectedCountryIndex][id.substring(0, id.length - 4)]);
              d3.select(this)
                .style("fill-opacity", 0.7)
                .style("stroke", "black")
                .style("stroke-width", 2)
                .style("stroke-opacity", 0.7);
            })
          .on("mouseout", function(d) {
              var id = this.getAttribute('id');
              theValue = parseFloat(risk[selectedCountryIndex][id.substring(0, id.length - 4)]);
              d3.select(this)
                .style("fill-opacity", 1)
                .style("stroke", "white")
                .style("stroke-width", 0)
                .style("stroke-opacity", 0);
            })
          .on("click", function(d) {
              var id = this.getAttribute('id');
              selectMetric(id.substring(0, id.length - 4))
            });

      // Arc text labels
      newTextArc = svgArc(inner + (i * arcWidth),
                          inner + (arcWidth/Math.sqrt(arcWidth)) + (i * arcWidth),
                          0.01 * tau,
                          0.99 * tau);

      textArcs.push(newTextArc);

      textArcGroup.append("path")
          .style("opacity", 0)
          .style("pointer-events", "none")
          .attr("d", textArcs[i])
          .attr("id", visibleFields[i] + " text arc");

      textArcGroup
        .append("text")
          .style("font-size", Math.sqrt(arcWidth) * 3)
          .style("fill", '#fff')
          .style("font-family", "Helvetica, Arial, sans-serif")
          .style("pointer-events", "none")
          .attr("id", visibleFields[i] + " text arc")
        .append("textPath")
          .attr("xlink:href","#" + visibleFields[i] + " text arc")
          .style("pointer-events", "pointer")
          .style("text-anchor", "middle")
          .attr("startOffset", "25.5%")
          .text(visibleFields[i].toUpperCase() + ": " + theText);

    }
  }

  function padDecimal(number) {
    if (isNaN(number)) {
      return 'no estimate';
    } else if (number.toString().indexOf('.') == -1) {
      return number += '.0'
    } else {
      return number;
    }
  }

  // Make site responsive to window size changes
  window.addEventListener("resize", function(event) {

    generateSVG();
    if (selectedCountry !== "") { displayArcs(); }

  }, true);

  function resetCountrySelection() {

    d3.select('#svg').selectAll('svg').remove();
    d3.select('#metricScores').selectAll('p').text('');
    d3.select('#countryTitle').text('');
    d3.select('#close-x').attr('class', 'hidden');

    d3.select('#svg').append('h2').attr('class', 'instructions').text('select a country on the map');

    selectMetric("INFORM RISK");

    d3.select('#thisMetric').text('');
    d3.select('#countryRankingLabel').text('');
    d3.select("#back-button").attr('class', 'hidden');

    selectedCountry = '';

    colorMap();
    map.setView([0,0], 2);
  }

}

//console.log(location.hash);
