/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function HealthCareCostMapper() {
    this.hospitals = [];
    this.hospitalsCosts = {};
    this.qualities = {};
    this.inpatientCosts = {};
    this.outpatientCosts = {};
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
        
        get('data/hospitalsCosts.json', function(data) {
            hcm.hospitalsCosts = data;
            count++;
            handleAllDataLoaded();
        });
        
        function handleAllDataLoaded() {
            if(count === 5) {
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
        
        var pid = this.hospital.provider_id;
        
        var oc = $('.overlayContainer');
                        
        oc.html('');
        oc.append('<h1>'+this.hospital.hospital_name+'</h1>');
        oc.append('<a href="#"><h2>Total Performance Score</h2></a>');
        
        // quality
        var template = '-- NO SCORE AVAILABLE --';
        var patientRatingTemplate = '-- NO RATINGS --';
        
        if(hcm.qualities.hasOwnProperty(pid)) {
            var perfClass = '';
            var num = 0;
            if(hcm.qualities[pid].hasOwnProperty('total_performance_score')) {
                // calculate the class
                num = Math.round(parseInt(hcm.qualities[pid].total_performance_score) / 10);
                perfClass = 'perf-' + num;
                template = '<div class="progBarCont"> \
                                    <div class="prog '+perfClass+'" style="width: '+(parseInt(hcm.qualities[pid].total_performance_score)).toFixed(0)+'%;"> \
                                        <div class="progShadow"></div> \
                                        <div class="progNum">'+(parseInt(hcm.qualities[pid].total_performance_score)).toFixed(0)+'</div> \
                                    </div> \
                                </div>';
            }
            
            if(hcm.qualities[pid].hasOwnProperty('patient_rating')) {
                if(hcm.qualities[pid].patient_rating.hasOwnProperty('patient_survey_star_rating')) {
                    var rating = parseInt(hcm.qualities[pid].patient_rating.patient_survey_star_rating);
                    if(!isNaN(rating)) {
                        patientRatingTemplate = '<span class="stars">';
                        for(var i = 1; i <= 5; i++) {
                            var className = '';
                            if(i > rating) {
                                className = 'greyStar';
                            }
                            patientRatingTemplate += '<img class="'+className+'" src="images/mapicons-70/star.svg" />';
                        }

                        // set up the survey star rating
                        patientRatingTemplate += '</span>';
                    }
                }
            }
        }
        oc.append(template);
        
        // cost
        var inpatientDollars = '-- NO DATA --';
        var outpatientDollars = '-- NO DATA --';

        if(hcm.hospitalsCosts.hasOwnProperty(pid)) {
            var c = hcm.hospitalsCosts[pid];
            
            if(c.hasOwnProperty('avg_inpatient_costs')) {
                var ids = getDollarSign(c.avg_inpatient_costs, HIGH_INPATIENT_STDEV, LOW_INPATIENT_STDEV);
                inpatientDollars = '<span class="dollarSign">'+ getDollarString(ids)+'</span>';
            }
            
            if(c.hasOwnProperty('avg_outpatient_costs')) {
                var ods = getDollarSign(c.avg_outpatient_costs, HIGH_OUTPATIENT_STDEV, LOW_OUTPATIENT_STDEV);
                outpatientDollars = '<span class="dollarSign">'+getDollarString(ods)+'</span>';
            }
        }
        
        var costTemplate =  '<div class="row dollar"> \
                                <div class="col-md-4"> \
                                    <h2>Overall Inpatient Cost</h2> \
                                    '+inpatientDollars+' \
                                </div> \
                                <div class="col-md-4"> \
                                    <h2>Overall Outpatient Cost</h2> \
                                    '+outpatientDollars+' \
                                </div> \
                                <div class="col-md-4"> \
                                    <h2>Patient Rating</h2> \
                                    '+patientRatingTemplate+' \
                                </div> \
                            </div>';

        oc.append(costTemplate);
        
        // cost charts
        console.log('hospital inpatient costs')
        console.log(hcm.inpatientCosts[pid]);
        
        if(hcm.inpatientCosts.hasOwnProperty(pid)) {
            var drgs = hcm.inpatientCosts[pid];
            var charges = '';
            for(var key in drgs) {
                var def = drgs[key].drg_definition;
                var charge = drgs[key].covered_charges;
                
                var tr =    '<tr> \
                                <td>'+def.substr(def.search(/[a-zA-Z ]+/)).replace(' W MCC', '').replace(' W/O MCC', '').replace(' W CC', '').replace('- ', '')+'</td> \
                                <td>$'+parseFloat(charge).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')+'</td> \
                            </tr>';
                
                charges += tr;
            }

            var costChart = '<h2>Average Inpatient Charges</h2> \
                            <div class="row charges"> \
                                <div class="col-md-2"></div> \
                                <div class="col-md-8"> \
                                    <table class="table table-striped"> \
                                        <thead> \
                                            <tr> \
                                                <th>Procedure</th> \
                                                <th>Average Covered Charges (Medicare)</th> \
                                            </tr> \
                                        </thead> \
                                        <tbody> \
                                            '+charges+' \
                                        </tbody> \
                                    </table> \
                                </div> \
                                <div class="col-md-2"></div> \
                            </div>';
            
            oc.append(costChart);
        }
        
        if(hcm.outpatientCosts.hasOwnProperty(pid)) {
            var mdcs = hcm.outpatientCosts[pid];
            console.log(mdcs)
            var charges = '';
            for(var key in mdcs) {
                var def = mdcs[key].apc_definition;
                var charge = mdcs[key].submitted_charges;
                
                var tr =    '<tr> \
                                <td>'+def.substr(def.search(/[a-zA-Z ]+/)).replace('- ', '')+'</td> \
                                <td>$'+parseFloat(charge).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')+'</td> \
                            </tr>';
                charges += tr;
            }

            var costChart = '<h2>Average Outpatient Charges</h2> \
                            <div class="row charges"> \
                                <div class="col-md-2"></div> \
                                <div class="col-md-8"> \
                                    <table class="table table-striped"> \
                                        <thead> \
                                            <tr> \
                                                <th>Procedure</th> \
                                                <th>Average Estimated Submitted Charges (Medicare)</th> \
                                            </tr> \
                                        </thead> \
                                        <tbody> \
                                            '+charges+' \
                                        </tbody> \
                                    </table> \
                                </div> \
                                <div class="col-md-2"></div> \
                            </div>';
            
            oc.append(costChart);
        }
        
        
//        TweenLite.to(oc, 0.75, {
//            top: 300,
//            ease: Bounce.easeOut
//        });

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