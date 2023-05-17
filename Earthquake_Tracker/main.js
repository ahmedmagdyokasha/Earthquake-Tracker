let map = new ol.Map({
  layers: [],
  target: "map",
  view: new ol.View({
    center: ol.proj.transform(
      [29.382269692080797, 27.82503961612639],
      "EPSG:4326",
      "EPSG:3857"
    ),
    zoom: 4,
    rorate: true,
    attribution: true,
  }),
});
const osm = new ol.layer.Tile({
  source: new ol.source.OSM(),
  visible: true,
  layerName: "OSM",
});
const stadiamap = new ol.layer.Tile({
  source: new ol.source.XYZ({
    url: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png",
  }),
  layerName: "Stad",
  visible: false,
});
const group = new ol.layer.Group({
  layers: [osm, stadiamap],
});
const popup = new ol.Overlay({
  element: document.getElementById("popup"),
});
////////////////////////////////////
const radio = document.getElementById("flexSwitchCheckChecked");
stadiamap.setVisible(true);
radio.addEventListener("click", (e) => {
  if (radio.checked) {
    console.log(radio.checked);
    stadiamap.setVisible(false);
    osm.setVisible(true);
  } else {
    console.log(radio.checked);
    stadiamap.setVisible(true);
    osm.setVisible(false);
  }
});
map.addLayer(group);
////////////////////////////
const searchPar = document.querySelector("#searchPar");
const searchList = document.querySelector("#places");
let Feature;
let timeref;
searchPar.addEventListener("input", (e) => {
  let typed = e.target.value;
  clearTimeout(timeref);
  timeref = setTimeout(() => {
    let RecData = GeoCode(typed);
    RecData.then((data) => {
      searchList.innerHTML = "";
      data.features.forEach((Feature) => {
        let name = Feature.properties.display_name;
        let li = document.createElement("li");
        li.id = Feature.properties.osm_id;
        li.addEventListener("click", (e) => {
          MakelistClickable(Feature);
        });
        li.innerHTML = name;
        searchList.append(li);
      });
    });
  }, 1000);
});
document.addEventListener("click", (e) => {
  const isClickInsideSearchBox = searchPar.contains(e.target);
  const isClickInsidePlacesList = searchList.contains(e.target);
  if (!isClickInsideSearchBox && !isClickInsidePlacesList) {
    searchList.style.display = "none";
  } else {
    searchList.style.display = "block";
  }
});
function GeoCode(Search) {
  return fetch(
    `https://nominatim.openstreetmap.org/search?q=${Search}&format=geojson`
  )
    .then((res) => res.json())
    .then((data) => {
      return data;
    });
}
let BufferLayer = new ol.layer.Vector({});
function MakelistClickable(features) {
  map.removeLayer(BufferLayer);
  Feature = features.geometry.coordinates;
  let coords = ol.proj.transform(Feature, "EPSG:4326", "EPSG:3857");
  map.getView().animate({ zoom: 5 }, { center: coords });
  Earthquakes(Feature);
  let bufferPoint = new ol.Feature({
    geometry: new ol.geom.Point(coords),
  });
  BufferLayer = new ol.layer.Vector({
    source: new ol.source.Vector({
      features: [bufferPoint],
    }),
    style: function (feature, resolution) {
      return new ol.style.Style({
        image: new ol.style.Circle({
          radius: 400000 / resolution,
          stroke: new ol.style.Stroke({ color: "#a4a6a550", width: 8 }),
          fill: new ol.style.Fill({ color: "#a4a6a550" }),
        }),
      });
    },
  });

  map.addLayer(BufferLayer);
}
let vectorLayer = new ol.layer.Vector({
  source: new ol.source.Vector(),
});
let size;
let clusterSource;

let clusterLayer = new ol.layer.Vector({
  source: new ol.source.Vector(),
});
let singleFeatureLayer = new ol.layer.Vector({
  source: new ol.source.Vector(),
});
function Earthquakes(Feature) {
  fetch(
    `https://earthquake.usgs.gov/ws/geoserve/places.json?latitude=${Feature[1]}&longitude=${Feature[0]}&maxradiuskm=300&type=geonames`
  )
    .then((res) => res.json())
    .then((data) => {
      // clusterLayer.getSource().clear();
      // singleFeatureLayer.getSource().clear();
      map.removeLayer(clusterLayer);
      map.removeLayer(singleFeatureLayer);
      var textFill = new ol.style.Fill({
        color: "#000000",
      });
      var textStroke = new ol.style.Stroke({
        color: "rgba(0, 0, 0, 0.1)",
        width: 1,
      });
      var singleFeatureStyle = function (data) {
        size = data.get("features").length;

        if (size == 1) {
          LegendFunc(data);

          var fillColor;
          var radius;
          var width;
          if (data.values_.features[0].values_.Earthquakedistance < 50) {
            fillColor = "#ab070760";
            radius = 18;
            width = 40;
          } else if (
            data.values_.features[0].values_.Earthquakedistance > 50 &&
            data.values_.features[0].values_.Earthquakedistance < 100
          ) {
            fillColor = "#f59e4260";
            radius = 12;
            width = 25;
          } else {
            fillColor = "#0b852360";
            radius = 9;
            width = 15;
          }
          return new ol.style.Style({
            image: new ol.style.Circle({
              radius: radius,
              fill: new ol.style.Fill({
                color: fillColor,
              }),
              stroke: new ol.style.Stroke({
                color: fillColor,

                width: width,
              }),
            }),
          });
        }
      };
      function styleFunction(data) {
        var style;
        var features = vectorLayer.getSource().getFeatures();
        size = data.get("features").length;
        let radius = Math.max(10, Math.min(size * 0.75, 20));
        if (features.length > 1) {
          style = [
            new ol.style.Style({
              image: new ol.style.Circle({
                radius: radius,
                fill: new ol.style.Fill({
                  color: "#96e5ff80",
                }),
                stroke: new ol.style.Stroke({
                  color: "#96e5ff30",
                  width: 6,
                }),
              }),
              text: new ol.style.Text({
                text: size.toString(),
                scale: 1.1,
                fill: textFill,
                stroke: textStroke,
              }),
            }),
          ];
          return style;
        }
      }
      let newFeatures = CreateFeatures(data);
      let mapSource = new ol.source.Vector({
        features: newFeatures,
      });
      clusterSource = new ol.source.Cluster({
        distance: 50,
        minDistance: 10,
        source: mapSource,
      });
      singleFeatureLayer = new ol.layer.Vector({
        source: clusterSource,
        style: singleFeatureStyle,
        zIndex: 2,
      });
      clusterLayer = new ol.layer.Vector({
        source: clusterSource,
        style: styleFunction,
      });
      map.addLayer(clusterLayer);
      map.addLayer(singleFeatureLayer);
    });
}

////////////////////////// legend func
function LegendFunc(data) {
  var extent = map.getView().calculateExtent(map.getSize());

  // Hide all legend items first

  // Loop through all features in the layer
  data.values_.features.forEach((Feature) => {
    // document.getElementById("green").style.display = "none";
    // document.getElementById("orange").style.display = "none";
    // document.getElementById("red").style.display = "none";
    // Check if feature is within current map extent and has EarthquakeDistance < 50
    console.log(Feature.values_.Earthquakedistance);
    if (
      // ol.extent.containsExtent(extent, Feature.getGeometry().getExtent()) &&
      Feature.values_.Earthquakedistance < 50
    ) {
      document.getElementById("legend").style.display = "block";
      document.getElementById("red").style.display = "inline-block";
    }
    // Check if feature has EarthquakeDistance between 50 and 100
    if (
      Feature.values_.Earthquakedistance >= 50 &&
      Feature.values_.Earthquakedistance < 100
    ) {
      document.getElementById("legend").style.display = "block";
      document.getElementById("orange").style.display = "inline-block";
    }
    // Check if feature has EarthquakeDistance > 100
    if (Feature.values_.Earthquakedistance >= 100) {
      document.getElementById("legend").style.display = "block";
      document.getElementById("green").style.display = "inline-block";
    }
  });
}

////////////////////////******************************************************** */
let EarthquakePoint;
function CreateFeatures(data) {
  let features = [];
  data.geonames.features.forEach((feature) => {
    let point = [
      feature.geometry.coordinates[0],
      feature.geometry.coordinates[1],
    ];
    let points = ol.proj.transform(point, "EPSG:4326", "EPSG:3857");
    EarthquakePoint = new ol.Feature({
      geometry: new ol.geom.Point(points),
      style: new ol.style.Style({
        fill: new ol.style.Fill({
          color: "rgba(255, 255, 255, 0.2)",
        }),
        stroke: new ol.style.Stroke({
          color: "rgba(0, 0, 0, 0.5)",
          lineDash: [10, 10],
          width: 2,
        }),
        image: new ol.style.Circle({
          radius: 5,
          stroke: new ol.style.Stroke({
            color: "rgba(0, 0, 0, 0.7)",
          }),
          fill: new ol.style.Fill({
            color: "rgba(255, 255, 255, 0.2)",
          }),
        }),
      }),
      CountryName: feature.properties.country_name,
      GovernorateName: feature.properties.name,
      Governoratepopulation: feature.properties.population,
      Earthquakedistance: feature.properties.distance,
    });
    features.push(EarthquakePoint);
    vectorLayer.getSource().addFeature(EarthquakePoint);
  });
  return features;
}
map.on("click", (e) => {
  let isClusterClicked = false;
  let isFeatureClicked = false;

  map.forEachFeatureAtPixel(e.pixel, function (feature) {
    if (feature.values_.features.length > 1) {
      let sum = 0;
      isClusterClicked = true;
      feature.values_.features.forEach((Feature) => {
        sum = sum + Feature.values_.Earthquakedistance;
      });
      let EarthquakedistanceAvg = parseInt(
        sum / feature.values_.features.length
      );
      popup.setPosition(e.coordinate);
      document.getElementById(
        "popup"
      ).innerHTML = `Number OF Earthquakes in this area: ${feature.values_.features.length}<br>The Avareage distances OF Earthquakes in this area: ${EarthquakedistanceAvg} Km`;
    } else if (feature.values_.features.length == 1) {
      isFeatureClicked = true;
      popup.setPosition(e.coordinate);
      document.getElementById(
        "popup"
      ).innerHTML = `CountryName: ${feature.values_.features[0].values_.CountryName}<br>StateName: ${feature.values_.features[0].values_.GovernorateName}<br>StatePopulation: ${feature.values_.features[0].values_.Governoratepopulation}<br>EarthquakeDistance: ${feature.values_.features[0].values_.Earthquakedistance} Km`;
    }
  });

  if (!isClusterClicked && !isFeatureClicked) {
    popup.setPosition(undefined);
  }
});

map.addOverlay(popup);
