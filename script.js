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

var lang = getQueryVariableGET('lang');
if (lang == "es") {
    var language = 0;
} else if (lang == "en") {
    var language = 1;
} else {
    var language = 0;
    lang = "es"
}

language = function language() {
    if (lang == 'en') {
        lang_number = 1;
        $(".en").css("display", "block");
        $(".es").css("display", "none");
    } else {
        lang_number = 0;
        $(".es").css("display", "block");
        $(".en").css("display", "none");
    };
}

maplibregl.accessToken = 'pk.eyJ1IjoiaGNhc3RlbGxhcm8iLCJhIjoiY2lrazJvZHFrMDl1eXYwa202Z2Njczk1eiJ9.fIBpy-XcIN0kKSuIx6oReA';

var title = main_items.title[language];
var map_style = main_items.map.style;
var map_center = main_items.map.center;
var map_zoom = main_items.map.zoom;
var region_box = main_items.map.region_box;
var acerca_de = main_items.acerca_de[language];
var description = main_items.description[language];

var map = new maplibregl.Map({
    container: 'map', // container id
    style: map_style, // stylesheet location
    bounds: new maplibregl.LngLatBounds(region_box),
});

// Add zoom and rotation controls to the map.
map.addControl(new maplibregl.NavigationControl());

// disable map zoom when using scroll
map.scrollZoom.disable();

map.on('load', function () {

    const boxInfo = document.getElementById('info');
    const boxHeader = document.getElementById('boxHeader');
    const boxBody = document.getElementById('boxBody');

    boxInfo.innerHTML = `
    <ul>
    <li>
    <span class="es"><i class="fa-solid fa-square leyenda"></i> Las zonas pintadas en el mapa corresponden a ciudades (de países) que se hayan adherido.</br ></span>
    <span class="en"><i class="fa-solid fa-square leyenda"></i> The areas painted on the map correspond to the countries that have joined.</span>
    </li>
    <li>
    <span class="es"><i class="fa-sharp fa-solid fa-location-dot location"></i> Corresponden a las ciudades que se han adherido.</br ></span>
    <span class="en"><i class="fa-sharp fa-solid fa-location-dot location"></i> Correspond to the cities that have adhered.</span>
    </li>
    <li>
    
    <span class="es"><i class="fa-solid fa-circle-question question" class="btn btn-primary"></i> Hoja de ruta/Estrategia de Economía Circular: Indica si la ciudad cuenta o está en proceso de desarrollo de su hoja de ruta o estrategia de economía circular.</span>
    <span class="en"><i class="fa-solid fa-circle-question question" class="btn btn-primary"></i> Roadmap/Circular Economy Strategy: Indicate whether the city has or is in the process of developing its circular economy roadmap or strategy.
    </span>

    <span class="es"><i class="fa-solid fa-circle-question question"></i> Sectores objetivo: Indica los sectores clave de economía circular en los cuales la ciudad cuenta con iniciativas o acciones en curso.</span>
    <span class="en"><i class="fa-solid fa-circle-question question"></i> Target sectors: Indicate the key circular economy sectors in which the city has ongoing initiatives or actions.</span>
   
    </li>
    </ul>
    `

    boxHeader.innerHTML = `<span class="es">Mapa Ciudades</span><span class="en">City map</span>`
    boxBody.innerHTML = `<span class="es">Por favor, seleccione una ciudad para ver su informacion</span><span class="en">Please select a city to see its information</span>`

    $.each(countries.features, function (i, country) {
        country.properties.in = 0
    })

    let geonodeName = "geonode:cities_depualc"
    let geodata = ''
    let urlGeonode = 'https://geoportal.cepal.org/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typename=' + geonodeName + '&outputFormat=json&srs=EPSG%3A4326&srsName=EPSG%3A4326';
    // `http://plataformaurbanapro-q.cepal.org/${lang}/ext/mapdata/circularcities.json`
    let urlJsonCiudades = `https://plataformaurbana.cepal.org/${lang}/ext/mapdata/circularcities.json`


    let membersId = []
    let year = ''
    let hoveredStateId = null;

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
                                        'generateId': true,
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
                                            'icon-color': [
                                                'case',
                                                ['boolean', ['feature-state', 'hover'], false],
                                                '#000000',
                                                '#FFFFFF'
                                            ],
                                            'icon-halo-width': 2,/* [
                                                'case',
                                                ['boolean', ['feature-state', 'hover'], false],
                                                1,
                                                0
                                            ],  */
                                            'icon-halo-color': '#000000',
                                            // 'icon-halo-blur': 10
                                        }
                                    });

                                    //DIV on hover
                                    map.on('mouseenter', 'ciudades', function (e) {

                                        if (e.features.length > 0) {
                                            if (hoveredStateId !== null) {
                                                map.setFeatureState(
                                                    { source: 'ciudades', id: hoveredStateId },
                                                    { hover: false }
                                                );
                                            }
                                            hoveredStateId = e.features[0].id;
                                            map.setFeatureState(
                                                { source: 'ciudades', id: hoveredStateId },
                                                { hover: true }
                                            );
                                        }

                                        const box = document.getElementById('box');
                                        const boxHeader = document.getElementById('boxHeader');
                                        const boxBody = document.getElementById('boxBody');

                                        map.getCanvas().style.cursor = 'pointer';
                                        box.style.display = 'block';

                                        const city_data = JSON.parse(e.features[0].properties.data)
                                        console.log(city_data.target_sectors)
                                        const target_sectors = city_data.target_sectors.replace(/',/g, "';").split(';')
                                        console.log(target_sectors)

                                        /*  const quitarSectoresDuplicados = target_sectors.reduce((acc,item)=> {
                                            if(!acc.includes(item)){
                                                acc.push(item);
                                            }
                                            return acc;
                                        },[]) */

                                        boxHeader.innerHTML = `<img src="./images/flags_square/${e.features[0].properties.country_code}.svg" style="height:2rem;border-radius:50%;">                              
                                ${e.features[0].properties.country_name}, ${e.features[0].properties.name_es}`

                                        boxBody.innerHTML = `      
                                <p class="title">
                                <span class="es">Población: ${e.features[0].properties.population}</span>
                                <span class="en">Population: ${e.features[0].properties.population}</span>
                                </p>
                                
                                <span class="es">Millones de habitantes <i>(última actualización: año ${year})</i></br ></br ></span>
                                <span class="en">Millions of inhabitants <i>(last update: year ${year})</i></br ></br ></span>
                              
                                <p class="title">
                                <span class="es">Fecha de adhesión a la declaración:</span>
                                <span class="en">Date of adherence to the declaration:</span>
                                </p>
                                ${city_data.adherence_date}
                                </br ></br >
                                
                                <p class="title">
                                <span class="es">Hoja de ruta/Estrategia de Economía Circular: <i class="fa-solid fa-circle-question question" class="btn btn-primary"></i></span>
                                
                                <span class="en">Roadmap/Circular Economy Strategy: <i class="fa-solid fa-circle-question question" class="btn btn-primary"></i></span>
                                </p>
                                ${city_data.roadmap_state}
                                </br ></br >
                      
                                <p class="title">
                                <span class="es">Sectores objetivos: <i class="fa-solid fa-circle-question question" data-bs-toggle="tooltip" data-bs-placement="left" title="
                                Lorem ipsum dolor sit amet, consectetur adipiscing elit. In ut vestibulum magna. Etiam ex arcu, mollis sit amet congue sit amet, ornare vel lacus. Mauris luctus finibus velit, sed fermentum arcu efficitur non. Praesent arcu leo, eleifend at tellus et, posuere tempus est. Donec a feugiat urna. Vivamus in lectus at erat ultrices commodo id eu massa. Etiam bibendum non orci id laoreet."></i></span>
                                <span class="en">Target sectors: <i class="fa-solid fa-circle-question question"></i></span>
                                            
                                </p><ul id="target_sectors"></ul>
                                </br >
                           
                                <button type="button" class="btn btn-primary container title"><a class="enlace" href="${city_data.link}">
                                <span class="es">Ver todos los datos <i class="fa-solid fa-chevron-right"></a></i></span>
                                <span class="en">See all data <i class="fa-solid fa-chevron-right"></a></i></span>
                                </button>
                              `
                                        const set = new Set(target_sectors);
                                        console.log(set)
                                        $.each(set, function (sector) {
                                            $("#target_sectors").append
                                                (`<li>${sector.replace("'", "").replace("'", "")}</li>`)
                                        })

                                        //tooltip
                                        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
                                        var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
                                            return new bootstrap.Tooltip(tooltipTriggerEl)
                                        })
                                        language()
                                    })

                                    map.on('mouseleave', 'ciudades', function () {

                                        if (hoveredStateId !== null) {
                                            map.setFeatureState(
                                                { source: 'ciudades', id: hoveredStateId },
                                                { hover: false }
                                            );
                                        }
                                        hoveredStateId = null;

                                        map.getCanvas().style.cursor = '';
                                        // box.style.display = 'none';
                                    });

                                });
                        })
                })
        })
    language()
}
);