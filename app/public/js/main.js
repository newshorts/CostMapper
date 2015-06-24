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
    this.definitions = [];
};

var hcm = new HealthCareCostMapper();

var map, geocoder, markers = [], openWindows = [], userHasSelectedProcedure = false, hospitalsWithProcedure = {};

(function($) {
    
    HealthCareCostMapper.prototype.init = function(callback) {
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
        
        get('data/definitions.json', function(data) {
            hcm.definitions = data;
            count++;
            handleAllDataLoaded();
        });
        
        function handleAllDataLoaded() {
            if(count === 6) {
                console.log('all data loaded');
                
                // continue loading the page
                placeMarkers(function() {
                    var mcOptions = {gridSize: 100, maxZoom: 6, imagePath: 'images/mapicons-70/m'};
                    var markerCluster = new MarkerClusterer(map, markers, mcOptions);
                    // callback
                    
                    if(typeof callback != 'undefined') {
                        setTimeout(callback, 100);
                    }
                });
            }
        }
    };
    
    HealthCareCostMapper.prototype.handleMarkerClick = function() {
        
        var pid = this.hospital.provider_id;
        
        var oc = $('.overlayContainer');
                        
        oc.html('');
        oc.append('<h1>'+this.hospital.hospital_name+'</h1>');
        oc.append('<address>'+getAddressTemplate(this.hospital)+'</address>');
        
        oc.append('<hr />');
        
        // total performance score
        var tps = getTPSTemplate(pid);
        oc.append('<h2>Total Performance Score</h2>');
        oc.append(tps);
        
        
        // dollar signs and stars
        var costTemplate = getCostsRatingsTemplate(pid);
        oc.append(costTemplate);
        
        oc.append('<hr />');
        
        // inpatient cost chart
        if(hcm.inpatientCosts.hasOwnProperty(pid)) {
            var inChart = getInpatientChartTemplate(pid);
            oc.append(inChart);
            
        }
        
        // outpatient cost chart
        if(hcm.outpatientCosts.hasOwnProperty(pid)) {
            var outChart = getOutpatientChartTemplate(pid);
            oc.append(outChart);
            
        }
        
        map.panTo(this.getPosition());
        
        // start and black and fade to white
        TweenLite.from(oc, 0.25, {
            backgroundColor: '#c8c8c8',
            ease: Power1.easeOut
        });
        
    };
    
    HealthCareCostMapper.prototype.handleMarkerHover = function() {
        var pid = this.hospital.provider_id;
        
        // assuming the currently hovered marker has the drg or mdc we are looking for
        if(userHasSelectedProcedure && hcm.qualities.hasOwnProperty(pid) && hospitalsWithProcedure.hasOwnProperty(pid)) {
            
            var defKey = hospitalsWithProcedure.definitionKey;
            var costKey = hospitalsWithProcedure.costKey;
            
            var content =   '<h2 style="text-align: center; font-size: 24px;">'+this.hospital.hospital_name+'</h2>';
            content +=  '<p style="text-align: center; font-size: 18px; font-weight: lighter;"><span>'+formatDef(hospitalsWithProcedure[pid][defKey])+'</span>: <br /><em>'+formatMoney(hospitalsWithProcedure[pid][costKey])+'</em></p>';
            var infoWindow = new google.maps.InfoWindow({
                content: content,
                disableAutoPan: true
            });

            infoWindow.open(map,this);
            
            openWindows.push(infoWindow);
        }
    };
    
    HealthCareCostMapper.prototype.handleMarkerHoverOut = function() {
        for(var i = 0, len = openWindows.length; i < len; i++) {
            openWindows[i].close();
        }
    };
    
    HealthCareCostMapper.prototype.filterBy = function(code, onComplete) {
        // TODO: go through all the markers and hide the ones that don't have this code in either thier mdc or drg
        
        // clear the list
        hospitalsWithProcedure = {};
        
        for(var i = 0, len = markers.length; i < len; i++) {
            
            markers[i].setVisible(true);
            var pid = markers[i].hospital.provider_id;
            var arr = {};
            
            if(code === '*') {
                // do nothing
                userHasSelectedProcedure = false;
            } else if(typeof code === 'number') {
                userHasSelectedProcedure = true;
                hospitalsWithProcedure.definitionKey = 'drg_definition';
                hospitalsWithProcedure.costKey = 'covered_charges';
                // we have drg
                if(hcm.inpatientCosts.hasOwnProperty(pid)) {
                    arr = hcm.inpatientCosts[pid];
                    if(!arr.hasOwnProperty(code)) {
                        // remove this marker from the map for the time being
                        markers[i].setVisible(false);
                    } else {
                        hospitalsWithProcedure[pid] = arr[code];
                    }
                } else {
                    // remove this marker
                    markers[i].setVisible(false);
                }
            } else {
                // we mdc
                userHasSelectedProcedure = true;
                hospitalsWithProcedure.definitionKey = 'apc_definition';
                hospitalsWithProcedure.costKey = 'submitted_charges';
                if(hcm.outpatientCosts.hasOwnProperty(pid)) {
                    arr = hcm.outpatientCosts[pid];
                    if(!arr.hasOwnProperty(code)) {
                        // remove this marker from the map for the time being
                        markers[i].setVisible(false);
                    } else {
                        hospitalsWithProcedure[pid] = arr[code];
                    }
                } else {
                    // remove marker
                    markers[i].setVisible(false);
                }
            }
            
        }
        
        onComplete();
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
    
//    function getProcedure() {
//        var proc = {
//            def: '',
//            cost: 0
//        };
//        
//        if(typeof userSelectedProcedure === 'number') {
//            // get inpatient drgs
//        } else {
//            // get outpatientmdcs
//        }
//        
//        return proc;
//    }
    
    // map helpers
    function initMaps() {  
        var mapOptions = {
            zoom: 5,
            center: new google.maps.LatLng(39.8282, -98.5795),
            scrollwheel: false,
            streetViewControl: false
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
        google.maps.event.addListener(marker, 'mouseover', hcm.handleMarkerHover);
        google.maps.event.addListener(marker, 'mouseout', hcm.handleMarkerHoverOut);
        marker.setMap(map);
        markers.push(marker);
    }

    function getMarkerIcon(tps) {
        var url;
        var imageName = Math.floor(parseFloat(tps)/10);
        if(typeof tps === 'undefined') {
            url = "images/mapicons-70/generic.png";
        } else {
            url = "images/mapicons-70/" + imageName + ".png";
        }

        var image = {
            url: url,
            size: new google.maps.Size(35,35), // the size it should be on the map
            scaledSize: new google.maps.Size(35,35), // the normal size of the image is 90x1100 because Retina asks double size.
            origin: new google.maps.Point(0, 0) // position in the sprite   
        };

        return image;
    }
    
    
    // template helpers
    function getAddressTemplate(hospital) {
        var addressStr = ''
        if(hospital.hasOwnProperty('address')) {
            addressStr += hospital.address;
        }
        
        if(hospital.hasOwnProperty('city')) {
            addressStr += '<br />' + hospital.city;
        }
        
        if(hospital.hasOwnProperty('state')) {
            addressStr += ', ' + hospital.state;
        }
        
        if(hospital.hasOwnProperty('zip')) {
            addressStr += ' ' + hospital.zip;
        }
        
        if(hospital.hasOwnProperty('phone_number') && hospital.phone_number.hasOwnProperty('phone_number')) {
            addressStr += '<br />' + hospital.phone_number.phone_number.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
        }
        
        return addressStr;
    }
    
    function getTPSTemplate(pid) {
        var template = '-- NO SCORE AVAILABLE --';
        
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
        }
        return template;
    }
    
    function getCostsRatingsTemplate(pid) {
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
        
        var patientRatingTemplate = getPatientRatingsTemplate(pid);
        
        var template =  '<div class="row dollar"> \
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
        
        return template;
    }
    
    function getPatientRatingsTemplate(pid) {
        var template = '-- NO RATINGS --';
        
        if(hcm.qualities[pid].hasOwnProperty('patient_rating')) {
            if(hcm.qualities[pid].patient_rating.hasOwnProperty('patient_survey_star_rating')) {
                var rating = parseInt(hcm.qualities[pid].patient_rating.patient_survey_star_rating);
                if(!isNaN(rating)) {
                    template = '<span class="stars">';
                    for(var i = 1; i <= 5; i++) {
                        var className = '';
                        if(i > rating) {
                            className = 'greyStar';
                        }
                        template += '<img class="'+className+'" src="images/mapicons-70/star.svg" />';
                    }

                    // set up the survey star rating
                    template += '</span>';
                }
            }
        }
        
        return template;
    }
    
    function getInpatientChartTemplate(pid) {
        var drgs = hcm.inpatientCosts[pid];
        var charges = formatRows(drgs, 'drg_definition', 'covered_charges');
        return formatChart('Average Inpatient Charges', 'Procedure', 'Average Covered Charges (Medicare)', charges);
    }
    
    function getOutpatientChartTemplate(pid) {
        var mdcs = hcm.outpatientCosts[pid];
        var charges = formatRows(mdcs, 'apc_definition', 'submitted_charges');        
        return formatChart('Average Outpatient Charges', 'Procedure', 'Average Estimated Submitted Charges (Medicare)', charges);
    }
    
    function formatRows(arr, defKey, chargeKey) {
        var charges = '';
        for(var key in arr) {
            var def = arr[key][defKey];
            var charge = arr[key][chargeKey];

            var tr =    '<tr> \
                            <td>'+formatDef(def)+'</td> \
                            <td>'+formatMoney(charge)+'</td> \
                        </tr>';

            charges += tr;
        }
        return charges;
    }
    
    function formatChart(title, t1h, t2h, charges) {
        return '<h2>'+title+'</h2> \
                <div class="row charges"> \
                    <div class="col-md-2"></div> \
                    <div class="col-md-8"> \
                        <table class="table table-striped"> \
                            <thead> \
                                <tr> \
                                    <th>'+t1h+'</th> \
                                    <th>'+t2h+'</th> \
                                </tr> \
                            </thead> \
                            <tbody> \
                                '+charges+' \
                            </tbody> \
                        </table> \
                    </div> \
                    <div class="col-md-2"></div> \
                </div>';
    }
    
    
    
    
})(jQuery);