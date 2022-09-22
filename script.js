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
    if (main_items.main_language == "english") {
        var language = 1;
    } else if (main_items.main_language == "spanish") {
        var language = 0;
    }
}

mapboxgl.accessToken = 'pk.eyJ1IjoiaGNhc3RlbGxhcm8iLCJhIjoiY2lrazJvZHFrMDl1eXYwa202Z2Njczk1eiJ9.fIBpy-XcIN0kKSuIx6oReA';

var title = main_items.title[language];
var map_style = main_items.map.style;
var map_center = main_items.map.center;
var map_zoom = main_items.map.zoom;
var region_box = main_items.map.region_box;
var lang = main_items.main_language;
var acerca_de = main_items.acerca_de[language];
var description = main_items.description[language];

var map = new mapboxgl.Map({
    container: 'map', // container id
    style: map_style, // stylesheet location
    bounds: new mapboxgl.LngLatBounds(region_box),
});


map.on('load', function () {

    map.addSource('countries', {
        type:'geojson',
        data:countries
    });

    map.addLayer({
        'id': 'countries',
        'type': 'fill',
        'source': 'countries',
        'layout': {
            'visibility': 'visible',
        },
        'paint': {
            'fill-color': '#ff6657',
            'fill-opacity': 0.5,
        }
    });

    let geonodeName = "geonode:cities_depualc"
    let geodata = ''
    let urlGeonode = 'https://geoportal.cepal.org/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typename=' + geonodeName + '&outputFormat=json&srs=EPSG%3A4326&srsName=EPSG%3A4326';
    let urlJsonCiudades = 'http://plataformaurbanapro-q.cepal.org/es/ext/mapdata/circularcities.json'
    let membersId = []

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
                    let url2 = "https://api-cepalstat.cepal.org/cepalstat/api/v1/indicator/" + indicator + "/data?members=" + members + "&lang=" + lang + "&format=json&app=geo-cepalstat";

                    console.log(url2)
                    fetch(url2)
                        .then((resp) => resp.json())
                        .then(function (statdata) {
                            statistics = statdata.body.data;
                            $.each(geodata.features, function (i, geounit) {
                                let statistic = statistics.find(object => {
                                    return object.dim_79515 == geounit.properties.id;
                                });
                                if (typeof (statistic) == 'object') {
                                    geodata.features[i].properties.population = Number(statistic.value);
                                } else {
                                    geodata.features[i].properties.population = -88888888
                                }
                            });
                            console.log(geodata)
                        }).then(function () {
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
                                            'icon-size': 1,
                                            'visibility': 'visible'
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
                                        boxHeader.innerHTML = `                                    
                                ${e.features[0].properties.country_name}, ${e.features[0].properties.name_es}`

                                        boxBody.innerHTML = `
                                                               
                                <p class="title">Población:
                                ${e.features[0].properties.population}</p>Millones de habitantes <i>(última actualización año 2015)</i></br ></br >
                              

                                <p class="title">Fecha de adhesión a la declaración:</p>
                                17 de marzo del 2021</br ></br >
                                

                                <p class="title">Hoja de ruta / Estrategia de Economía Circular: <i class="fa-solid fa-circle-question question"></i></p></br >

                                <p class="title">Sectores objetivos: <i class="fa-solid fa-circle-question question"></i></p></br >

                                <button type="button" class="btn btn-primary container title">Ver todos los datos <i class="fa-solid fa-chevron-right"></i></button>

                                
                                ` 

                                    })

                                    map.on('mouseleave', 'ciudades', function () {
                                        map.getCanvas().style.cursor = '';
                                        box.style.display = 'none';
                                    });

                                });
                        })
                })




        })
});