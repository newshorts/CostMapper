/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function HealthCareCostMapper() {
    this.hospitals = [];
    this.qualities = [];
    this.inpatientCosts = [];
    this.outpatientCosts = [];
};

var hcm = new HealthCareCostMapper();

var map, geocoder, markers = [];

(function($) {
    
    HealthCareCostMapper.prototype.init = function() {
        initMaps();
        
        var count = 0;
        
        // load all the data for the page
        get('data/hospitals.json', function(data) {
            hcm.hospitals = data;
            count++;
            handleAllDataLoaded();
        });
        
        get('data/quality.json', function(data) {
            hcm.qualities = data;
            count++;
            handleAllDataLoaded();
        });
        
        get('data/inpatient.json', function(data) {
            hcm.inpatientCosts = data;
            count++;
            handleAllDataLoaded();
        });
        
        get('data/outpatient.json', function(data) {
            hcm.outpatientCosts = data;
            count++;
            handleAllDataLoaded();
        });
        
        function handleAllDataLoaded() {
            if(count === 4) {
                console.log('all data loaded');
                console.log(hcm);
                
                // continue loading the page
                placeMarkers(function() {
                    var mcOptions = {gridSize: 100, maxZoom: 6, imagePath: 'images/mapicons-70/m'};
                    var markerCluster = new MarkerClusterer(map, markers, mcOptions);
                });
            }
        }
    };
    
    HealthCareCostMapper.prototype.handleMarkerClick = function() {
        console.log(this);
    };
    
    // helpers
    function get(url, callback) {
        $.get(url, function(data) {
            if(typeof callback === "function") {
                if(typeof data === 'object') {
                    callback(data);
                } else {
                    callback(JSON.parse(data));
                }    
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
        
        var w = $(window).width();
        $('#map-canvas').css({
            height: w * 0.3 + 'px'
        });
    }
    
    function placeMarkers(callback) {
        for(var i = 0; i < hcm.hospitals.length; i++) {
            var h = hcm.hospitals[i];

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
//        var image = getMarkerIcon(hospital.total_performance_score);
        var image;
        if(hcm.qualities.hasOwnProperty(hospital.provider_id)) {
            image = getMarkerIcon(hcm.qualities[hospital.provider_id].total_performance_score);
        } else {
            image = getMarkerIcon();
        }
        
        var marker = new google.maps.Marker({
            position: myLatlng,
            map: map,
            title: hospital.hospital_name,
            hospital: hospital,
            icon: image
        });
        google.maps.event.addListener(marker, 'click', hcm.handleMarkerClick);
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