/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function HealthCareCostMapper() {
    this.hospitals = [];
};

var __ = new HealthCareCostMapper();

var map, geocoder, markers = [];

(function($) {
    
    HealthCareCostMapper.prototype.init = function() {
        get('data/combined_quality_cost_geocoded.json', function(hospitals) {
            __.hospitals = hospitals;
            console.log(__.hospitals);

            initMaps();
            placeMarkers(function() {
                var mcOptions = {gridSize: 100, maxZoom: 6, imagePath: 'images/mapicons-70/m'};
                var markerCluster = new MarkerClusterer(map, markers, mcOptions);
                console.log(markerCluster.styles_)
            });
            console.log(markers);
        });
    };
    
    // helpers
    function get(url, callback) {
        $.get(url, function(data) {
            if(typeof callback === "function") {
                callback(JSON.parse(data));
            }
        });
    }

    function initMaps() {  
        var mapOptions = {
            zoom: 5,
            center: new google.maps.LatLng(39.8282, -98.5795)
        };
        map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
        geocoder = new google.maps.Geocoder();

//        __.setMapFullScreen();
    }

    HealthCareCostMapper.prototype.setMapFullScreen = function() {
        var w = $(window).width();
        var h = $(window).height();

        $('#map-canvas').css({
            width: w + 'px',
            height: h + 'px'
        });

    };

    function placeMarkers(callback) {
        for(var i = 0; i < __.hospitals.length; i++) {
            var h = __.hospitals[i];

            // filter stuff that has nothing
            if(!h.hasOwnProperty("outpatient_costs") && !h.hasOwnProperty("total_performance_score")) {
                continue;
            }

            if(h.location.hasOwnProperty("latitude")) {
                var lat = parseFloat(h.location.latitude);
                var lng = parseFloat(h.location.longitude);
                var latlng = new google.maps.LatLng(lat, lng);
                placeMarker(latlng, h);
            }
        }

        if(typeof callback === 'function') {
            callback();
        }
    }

    function placeMarker(myLatlng, hospital) {
        var image = getMarkerIcon(hospital.total_performance_score);

        var marker = new google.maps.Marker({
            position: myLatlng,
            map: map,
            title: hospital.hospital_name,
            hospital: hospital,
            icon: image
        });
        google.maps.event.addListener(marker, 'click', function handleMarkerClick() {
            console.log(this.hospital);
        });
        marker.setMap(map);
        markers.push(marker);
    }

    function getMarkerIcon(tps) {
        var url;
        if(typeof tps === 'undefined') {
            url = "images/mapicons-70/generic.png";
        } else {
            url = "images/mapicons-70/" + Math.floor(parseFloat(tps)/10) + ".png";
        }

        var image = {
            url: url,
            size: new google.maps.Size(35,35), // the size it should be on the map
            scaledSize: new google.maps.Size(35,35), // the normal size of the image is 90x1100 because Retina asks double size.
            origin: new google.maps.Point(0, 0) // position in the sprite   
        };

        return image;
    }
})(jQuery);