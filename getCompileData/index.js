/**
 * 
 * This app will compile the healthcare data for these sources:
 * 
 * https://docs.google.com/spreadsheets/d/1VwkwUSGB0AdjhcmABb6AulUo7CS22TsyfL7XYTuLHb0/edit#gid=0
 * 
 * It works by visiting each "get" request, the app will compile a json file with the relevant data
 * 
 * The main app will work off the general hospital json file and will call these supporting files with the provider_id.
 * All the supporting files are indexed according to provider_id, requiring less iteration over data
 * 
 * @type type
 */

var express = require('express');
var app = express();
var urlParser = require('url');
var http = require('http'),
    https = require('https');
var fs = require('fs');
    
// globals
var socrataAppToken = 'mGcIawd37Jx9jP3guva8ugxoO';
var googleServerKey = 'AIzaSyDXsG-0hV1RHgsTzsrs_QoPL3_Cc798_U4';
var retrievalLimit = 50000;

app.set('view engine', 'ejs'); 
app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

app.get('/', function(req, res) {
    res.render('confirm', { title: 'The index page!' });
});

app.get('/hospitals', function(req, res) {
    
    // get and render the hospitals.json file
    var hospitals = [];
    
    // get hospitals
    getGeneralHospitalInformationSocrata(function(data) {
        // loop and geocode all hospitals
        for(var i = 0, len = data.length; i < len; i++) {
            var entry = padPid(data[i]);
            hospitals.push(entry);
        }
        
         // save to a file
        var file = 'data/hospitals.json';
        fs.writeFile(file, JSON.stringify(hospitals), function(err) {
            if(err) {
                res.render('index', { title: 'unsuccessful', status: err });
                console.log(err);
            } else {
                console.log("The file was saved!");
                res.render('index', { title: 'success', status: 'success' });
            }
        });
    });
});

// loop the hospitals geo coding ones that do not have a lat/long
app.get('/geocode', function(req, res) {
    var hospitals = [];
    fs.readFile('data/hospitals.json', 'utf8', function (err, data) {
        if (err) throw err;
        hospitals = JSON.parse(data);
        
        geocodeAll();
    });
    
    var idx = 0;
    function geocodeAll() {
        if(idx >= hospitals.length) {
            // save to a file
            var file = 'data/hospitals.json';
            fs.writeFile(file, JSON.stringify(hospitals), function(err) {
                if(err) {
                    res.render('index', { title: 'unsuccessful', status: err });
                    console.log(err);
                } else {
                    console.log("The file was saved!");
                    res.render('index', { title: 'success', status: 'success' });
                }
            });
            return;
        }
        
        var h = hospitals[idx];
        
        if(!h.location.hasOwnProperty('latitude')) {
            // we need to geocode
            var addr = h.address + ',+' + h.city + ',+' + h.state + '+' + h.zip_code;
            geocode(addr, function(geo) {
                if(geo.hasOwnProperty('lat')) {
                    h.location.latitude = geo.lat;
                    h.location.longitude = geo.lng;
                }
                
                // otherwise we just move on
                setTimeout(function() {
                    idx++;
                    geocodeAll();
                }, Math.random() * 200 + 333);
            });
        } else {
            idx++;
            geocodeAll();
        }
    }
});

app.get('/quality', function(req, res) {
    
    // get and render the quality.json file
    
    var qualities = {};
    
    // get the tps scores
    getTPSSocrata(function(data) {
        for(var i = 0, len = data.length; i < len; i++) {
            var entry = padPid(data[i]);
            if(qualities.hasOwnProperty(entry.provider_id)) {
                qualities[entry.provider_id].total_performance_score = entry.total_performance_score;
            } else {
                qualities[entry.provider_id] = {
                    total_performance_score: entry.total_performance_score
                };
            }
        }
        
        // let socrata catch up
        setTimeout(function() {
            // get the patient ratings
            getPatientRatingsSocrata(function(data) {
                for(var i = 0, len = data.length; i < len; i++) {
                    var entry = padPid(data[i]);
                    var obj = copyAndRemovePid(entry);
                    if(qualities.hasOwnProperty(entry.provider_id)) {
                        qualities[entry.provider_id].patient_rating = obj;
                    } else {
                        qualities[entry.provider_id] = {
                            patient_rating: obj
                        };
                    }
                }    

                // save to a file
                var file = 'data/quality.json';
                fs.writeFile(file, JSON.stringify(qualities), function(err) {
                    if(err) {
                        res.render('index', { title: 'unsuccessful', status: err });
                        return console.log(err);
                    }

                    console.log("The file was saved!");
                    res.render('index', { title: 'success', status: 'success' });
                });
            });
        }, Math.random() * 500 + 300);
    });
    
    // loop and render a keyed object with scores according indexed by provider_id
});

app.get('/inpatient', function(req, res) {
    
    // get and render the inpatient.json file
    var costs = {};
    // get inpatient records from socrata
    getInpatientSocrata(function(data) {
        // loop and re-index by provider_id
        for(var i = 0, len = data.length; i < len; i++) {
            var entry = padPid(data[i]);
            var drg_num = pad(parseInt(entry.drg_definition), 3);
            var obj = copyAndRemovePid(entry);
            
            if(costs.hasOwnProperty(entry.provider_id)) {
                // then we need to just add
                costs[entry.provider_id][drg_num] = obj;
            } else {
                // create a new entry
                costs[entry.provider_id] = {};
                costs[entry.provider_id][drg_num] = obj;
            }
        }
        
        // save to a file
        var file = 'data/inpatient.json';
        fs.writeFile(file, JSON.stringify(costs), function(err) {
            if(err) {
                res.render('index', { title: 'unsuccessful', status: err });
                return console.log(err);
            }

            console.log("The file was saved!");
            res.render('index', { title: 'success', status: 'success' });
        });
    });
});

app.get('/outpatient', function(req, res) {
    
    // get and render the outpatient.json file
    var costs = {};
    getOutpatientSocrata(function(data) {
        
        // loop and re-index by provider_id
        for(var i = 0, len = data.length; i < len; i++) {
            var entry = padPid(data[i]);
            var obj = copyAndRemovePid(entry);
            var apc_num = pad(parseInt(entry.apc_definition), 4);
            
            if(costs.hasOwnProperty(entry.provider_id)) {
                // then we need to just add
                costs[entry.provider_id][apc_num] = obj;
            } else {
                // create a new entry
                costs[entry.provider_id] = {};
                costs[entry.provider_id][apc_num] = obj;
            }
        }
        
        // save to file
        var file = 'data/outpatient.json';
        fs.writeFile(file, JSON.stringify(costs), function(err) {
            if(err) {
                res.render('index', { title: 'unsuccessful', status: err });
                return console.log(err);
            }

            console.log("The file was saved!");
            res.render('index', { title: 'success', status: 'success' });
        });
       
    });
});

app.listen(app.get('port'), function() {
    console.log("Node app is running at localhost:" + app.get('port'));
});

// helpers
function geocode(addr, callback) {
    var google = 'https://maps.googleapis.com/maps/api/geocode/json';
    var url = google + '?address='+addr.replace(/ /g, '+')+'&key=' + googleServerKey;
    
    getJSON(url, function(data) {
        console.log(data);
        if(data.status === 'OK') {
            var latLng = {
                lat: data.results[0].geometry.location.lat,
                lng: data.results[0].geometry.location.lng
            };
            callback(latLng);
        } else {
            callback('Geocode was not successful for the following reason: ' + data.status);
        }
    });
}

function getGeneralHospitalInformationSocrata(callback) {
    var socrata = 'https://data.medicare.gov/resource/xubh-q36u.json';
    getSocrata(socrata, callback);
}

function getTPSSocrata(callback) {
    var socrata = 'https://data.medicare.gov/resource/ypbt-wvdk.json';
    var select = '$select=provider_number AS provider_id,';
        select += 'total_performance_score';
    var inpatientURL = socrata + '?' + select;
    
    getSocrata(inpatientURL, callback);
}

function getPatientRatingsSocrata(callback) {
    var socrata = 'https://data.medicare.gov/resource/dgck-syfz.json';
    var filter = 'hcahps_measure_id=H_STAR_RATING';
    var select = '&$select=number_of_completed_surveys,provider_id,patient_survey_star_rating';
    
    var prURL = socrata + '?' + filter + select;
    
    getSocrata(prURL, callback);
    
}

function getOutpatientSocrata(callback) {
    var socrata = 'https://data.cms.gov/resource/tr34-anpb.json';
    var select = '$select=provider_id,';
        select += 'apc AS apc_definition,';
        select += 'average_total_payments AS total_payments,';
        select += 'outpatient_services,';
        select += 'average_estimated_submitted_charges AS submitted_charges';
    var outpatientURL = socrata + '?' + select;
    
    getSocrata(outpatientURL, callback);
}

function getInpatientSocrata(callback) {
    var socrata = 'https://data.cms.gov/resource/xpsg-6hup.json';
    var select = '$select=provider_id,';
        select += 'average_covered_charges AS covered_charges,';
        select += 'average_medicare_payments AS medicare_payments,';
        select += 'total_discharges,';
        select += 'drg_definition,';
        select += 'average_total_payments AS total_payments';
    
    var inpatientURL = socrata + '?' + select;
    
    getSocrata(inpatientURL, callback);
}

function getSocrata(url, callback) {
    var results = [];
    var page = 0;
    
    function getSocrataAux() {
        var token = '&$$app_token=' + socrataAppToken;
        var limit = '&$limit=' + retrievalLimit;
        var offset = '&$offset=' + (page * retrievalLimit);
        url = (url.indexOf('?') > -1) ? url : url + '?';
        var cleanURL = url + limit + offset + token;
        
        getJSON(cleanURL, function(data) {
            for(var i = 0; i < data.length; i++) {
                results.push(data[i]);
            }
            
            if(data.length === 50000) {
                page++;
                setTimeout(function() {
                    getSocrataAux();
                }, Math.random() * 800 + 300);
            } else {
                callback(results);
            }
        });
    }
    
    getSocrataAux();
}

function getJSON(url, callback) {
    var urlObj = urlParser.parse(url);
    var protocol = (urlObj.protocol === 'http') ? http : https;
    
    console.log('calling: ' + url);
    
    var req = protocol.get(url, function(res) {
        var output = '';
        console.log('received status code: ' + res.statusCode);

        res.on('data', function(chunk) {
            output += chunk;
        });

        res.on('end', function() {
            callback(JSON.parse(output));
        });
    });
    
    req.on('error', function(err) {
        console.log(err);
    });
    
    req.end();
}

//function pad(num, size) {
//    var s = "000000000" + parseInt(num);
//    return s.substr(s.length-size);
//}

//function pad(n, width, z) {
//    z = z || '0';
//    n = n + '';
//    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
//}

function copyAndRemovePid(obj) {
    var result = {};
    for(var name in obj) {
        if(name !== 'provider_id') {
            result[name] = obj[name];
        }
    }
    return result;
}

function padPid(obj) {
    obj.provider_id = pad(obj.provider_id, 6);
    return obj;
}

function pad(num, places) {
    var zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join("0") + num;
}