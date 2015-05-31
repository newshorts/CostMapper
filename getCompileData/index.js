var express = require('express');
var app = express();
var urlParser = require('url');
var http = require('http'),
    https = require('https');
var fs = require('fs');
    
// globals
var socrataAppToken = 'mGcIawd37Jx9jP3guva8ugxoO';
var googleGeoToken = 'AIzaSyB8TUF9fBkzfu9zMxszOL0A7MAXeOqcrnw';
var retrievalLimit = 50000;

app.set('view engine', 'ejs'); 
app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

app.get('/', function(req, res) {
    res.render('index', { title: 'The index page!' });
});

app.get('/hospitals', function(req, res) {
    
    // get and render the hospitals.json file
    
    // get hospitals
    // loop and geocode all hospitals
    // output to a json file
    
    res.render('index', { title: 'The index page!', status: 'done' });
});

app.get('/quality', function(req, res) {
    
    // get and render the quality.json file
    
    // get the tps scores
    // get the patient ratings
    // loop and render a keyed object with scores according indexed by provider_id
    
    res.render('index', { title: 'The index page!', status: 'done' });
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
            
            // pad the provider id
//            entry.provider_id = pad(entry.provider_id, 6);
            
//            var obj = {};
            var apc_num = pad(parseInt(entry.apc_definition), 4);
            
//            for(var name in entry) {
//                if(name !== 'provider_id') {
//                    obj[name] = entry[name];
//                }
//            }
            
            var obj = copyAndRemovePid(entry);
            
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
    var url = google + '?address='+addr.replace(/ /g, '+')+'&key=' + googleGeoToken;
    
    getJSON(url, function(data) {
        if(data.status === 'OK') {
            var latLng = {
                lat: data.results[0].geometry.location.lat,
                lng: data.results[0].geometry.location.lng
            };
            callback(latLng);
        } else {
            callback('Geocode was not successful for the following reason: ' + resp.status);
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
        select += 'total_performance_score AS total_performance_score,';
    var inpatientURL = socrata + '?' + select;
    
    getSocrata(inpatientURL, callback);
}

function getPatientRatingsSocrata(callback) {
    var socrata = 'https://data.medicare.gov/resource/dgck-syfz.json';
    var filter = 'hcahps_measure_id=H_STAR_RATING';
    
    var prURL = socrata + '?' + filter;
    
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