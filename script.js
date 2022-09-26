// parsear la url despues del signo de pregunta (parametros) > contexto
function getQueryVariableGET(variable) {
    // Estoy asumiendo que query es window.location.search.substring(1);
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == variable) {
            return pair[1];
        }
    }
    return false;
};

//tooltip
$(function () {
    $('[data-toggle="tooltip"]').tooltip()
})


var lang = getQueryVariableGET('lang');
if (lang == "es") {
    var language = 0;
} else if (lang == "en") {
    var language = 1;
} else {
    if (main_items.main_language == "english") {
        var language = 1;
    } else if (main_items.main_language == "spanish") {
        var language = 0;
    }
}

maplibregl.accessToken = 'pk.eyJ1IjoiaGNhc3RlbGxhcm8iLCJhIjoiY2lrazJvZHFrMDl1eXYwa202Z2Njczk1eiJ9.fIBpy-XcIN0kKSuIx6oReA';

var title = main_items.title[language];
var map_style = main_items.map.style;
var map_center = main_items.map.center;
var map_zoom = main_items.map.zoom;
var region_box = main_items.map.region_box;
var lang = main_items.main_language;
var acerca_de = main_items.acerca_de[language];
var description = main_items.description[language];

var map = new maplibregl.Map({
    container: 'map', // container id
    style: map_style, // stylesheet location
    bounds: new maplibregl.LngLatBounds(region_box),
});


map.on('load', function () {

    const boxInfo = document.getElementById('info');
    boxInfo.innerHTML = `
    <ul>
    <li>Las zonas pintadas en el mapa corresponden a los países que se hayan adherido.</br ></li>
    <li><i class="fa-sharp fa-solid fa-location-dot location"></i> Corresponden a las ciudades que se han adherido.</li>
    </ul>
    `     

    $.each(countries.features, function (i, country) {
        country.properties.in = 0
    })

    let geonodeName = "geonode:cities_depualc"
    let geodata = ''
    let urlGeonode = 'https://geoportal.cepal.org/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typename=' + geonodeName + '&outputFormat=json&srs=EPSG%3A4326&srsName=EPSG%3A4326';
    let urlJsonCiudades = 'http://plataformaurbanapro-q.cepal.org/es/ext/mapdata/circularcities.json'
    let membersId = []
    let year = ''

    fetch(urlGeonode)
        .then((resp) => resp.json())
        .then(function (data) {
            geodata = data
        }).then(function (data) {
            fetch(urlJsonCiudades)
                .then((resp) => resp.json())
                .then(function (dataCiudades) {
                    dataJsonCiudades = dataCiudades
                }).then(function () {
                    $.each(geodata.features, function (i, geounit) {
                        let cityData = dataJsonCiudades.find(object => {
                            return object.id == geounit.properties.id;
                        });
                        if (typeof (cityData) == 'object') {
                            geodata.features[i].properties.data = cityData;
                            membersId.push(cityData.id)
                        } else {
                            geodata.features[i].properties.data = ''
                        }
                    })
                }).then(function () {
                    let indicator = 4411;
                    let members = '84284,' + membersId;
                    let apiCepalstat = "https://api-cepalstat.cepal.org/cepalstat/api/v1/indicator/" + indicator + "/data?members=" + members + "&lang=" + lang + "&format=json&app=geo-cepalstat";

                    console.log(apiCepalstat)
                    fetch(apiCepalstat)
                        .then((resp) => resp.json())
                        .then(function (statdata) {
                            var statistics = statdata.body.data;
                            var dimension = statdata.body.dimensions.find(object => {
                                return object.id == 79515;
                            });
                            var year_dimension = statdata.body.dimensions.find(object => {
                                return object.id == 29117;
                            });
                            year_record = year_dimension.members.find(object => {
                                return object.in == 1;
                            });
                            year = year_record.name
                            let cities_id = []
                            let cities = {}
                            $.each(geodata.features, function (i, geounit) {
                                let statistic = statistics.find(object => {
                                    return object.dim_79515 == geounit.properties.id;
                                });
                                if (typeof (statistic) == 'object') {
                                    geodata.features[i].properties.population = Number(statistic.value);
                                    cities[geodata.features[i].properties.id] = 0
                                    cities_id.push(geodata.features[i].properties.id)
                                } else {
                                    geodata.features[i].properties.population = -88888888
                                }
                            });
                            const findCountry = (city, currentParent) => {
                                var parent = dimension.members.find(object => {
                                    return object.id == currentParent;
                                });
                                if (parent.parent == 79515) {
                                    var country_parent = countries.features.find(object => {
                                        return object.properties.depualc == currentParent;
                                    });
                                    country_parent.properties.in = 1
                                    var city_founded = geodata.features.find(object => {
                                        return object.properties.id == city;
                                    });
                                    city_founded.properties.country_id = currentParent
                                    city_founded.properties.country_name = country_parent.properties.name_es
                                    city_founded.properties.country_code = country_parent.properties.ISO_A3
                                } else {
                                    cities[city] = parent.parent
                                    findCountry(city, parent.parent)
                                }
                            }
                            $.each(cities_id, function (i, city) {
                                findCountry(city, city)
                            })


                        }).then(function () {
                            map.addSource('countries_labels', {
                                type: 'geojson',
                                data: countries_labels
                            });

                            map.addSource('boundaries', {
                                type: 'geojson',
                                data: countries
                            });

                            map.addSource('countries', {
                                type: 'geojson',
                                data: countries
                            });

                            map.addLayer({
                                'id': 'countries',
                                'type': 'fill',
                                'source': 'countries',
                                'layout': {
                                    'visibility': 'visible',
                                    // 'symbol-z-order':'source'
                                },
                                //'filter': ['==', ["get", "in"], 1],
                                'paint': {
                                    'fill-color': ['match', ['get', 'in'], 1, '#ff6657', '#E2C0C9'],
                                    'fill-opacity': 1,
                                }
                            });

                            map.addLayer({
                                'id': "boundaries",
                                'type': 'line',
                                'source': 'boundaries',
                                'layout': {
                                    'line-join': 'round',
                                    'line-cap': 'round',
                                    // 'symbol-z-order':'source'
                                },
                                'paint': {
                                    'line-color': '#FFFFFF',
                                    'line-width': 1
                                }
                            });

                            map.addLayer({
                                'id': "countries_labels",
                                'type': 'symbol',
                                'source': 'countries_labels',
                                'layout': {
                                    'visibility': 'visible',
                                    'text-field': ['get', 'name_es'],
                                    'text-size': 12,
                                    'text-font': ['Arial Unicode MS Regular'],
                                    // 'symbol-z-order':'source'
                                },
                                'paint': {
                                    'text-color': 'black',
                                    'text-opacity': 1,
                                    'text-halo-color': 'white',
                                    'text-halo-width': 2,
                                }
                            });

                            let image_url = "./images/location_icon.png"
                            map.loadImage(
                                image_url,
                                function (error, image) {
                                    if (error) throw error;

                                    // Add the image to the map style.
                                    map.addImage('location_icon', image, {
                                        'sdf': true
                                    });


                                    // Add a data source containing one point feature.
                                    map.addSource("ciudades", {
                                        'type': 'geojson',
                                        'data': geodata
                                    });

                                    // Add a symbol layer
                                    map.addLayer({
                                        'id': 'ciudades',
                                        'type': 'symbol',
                                        'source': 'ciudades',
                                        'layout': {
                                            'icon-image': 'location_icon',
                                            'icon-size': 0.5,
                                            'visibility': 'visible',
                                            'icon-allow-overlap': true,
                                        },
                                        'filter': ['!=', ["get", "data"], ''],
                                        'paint': {
                                            'icon-color': '#FFFFFF',
                                        }
                                    });

                                    //DIV on hover
                                    map.on('mouseenter', 'ciudades', function (e) {
                                        const box = document.getElementById('box');
                                        const boxHeader = document.getElementById('boxHeader');
                                        const boxBody = document.getElementById('boxBody');

                                        map.getCanvas().style.cursor = 'pointer';
                                        box.style.display = 'block';

                                        const city_data = JSON.parse(e.features[0].properties.data)
                                        console.log(city_data.target_sectors)
                                        const target_sectors = city_data.target_sectors.replace(/',/g, "';").split(';')
                                        boxHeader.innerHTML = `<img src="./images/flags_square/${e.features[0].properties.country_code}.svg" style="height:2rem;border-radius:50%;">                              
                                ${e.features[0].properties.country_name}, ${e.features[0].properties.name_es}`

                                        boxBody.innerHTML = `      
                                <p class="title">Población:
                                ${e.features[0].properties.population}</p>Millones de habitantes <i>(última actualización: año ${year})</i></br ></br >
                              
                                <p class="title">Fecha de adhesión a la declaración:</p>
                                ${city_data.adherence_date}
                                </br ></br >
                                
                                <p class="title">Hoja de ruta / Estrategia de Economía Circular: <i class="fa-solid fa-circle-question question" data-toggle="tooltip" data-placement="top" title="Hooray!"></i></p>
                                ${city_data.roadmap_state}
                                </br ></br >
                      
                                <p class="title sectores">Sectores objetivos: <i class="fa-solid fa-circle-question question" data-toggle="tooltip" data-placement="top" title="Tooltip on top"></i></p><ul id="target_sectors"></ul>
                                </br >
                           
                                <button type="button" class="btn btn-primary container title"><a class="enlace" target="_blank" href="${city_data.link}">Ver todos los datos <i class="fa-solid fa-chevron-right"></a></i></button>`

                                        target_sectors.map((sector) => {
                                            $("#target_sectors").append
                                                (`<li>${sector.replace("'", "").replace("'", "")}</li>`)
                                        })
                                    })

                                    map.on('mouseleave', 'ciudades', function () {
                                        map.getCanvas().style.cursor = '';
                                        // box.style.display = 'none';
                                    });

                                });
                        })
                })




        })


});