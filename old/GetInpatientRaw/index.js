var express = require('express');
var app = express();
var fs = require('fs');
var http = require('http'),
    https = require('https');

app.set('view engine', 'ejs'); 
app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

app.get('/start', function(req, res) {
    
    // call the get function
    getFromSocrata(function(costs) {
        // store the costs in a json file
        var file = 'data/inpatient_costs_raw.json';
        fs.writeFile(file, JSON.stringify(costs), function(err) {
            if(err) {
                res.render('index', { title: 'unsuccessful', error: err });
                return console.log(err);
            }

            console.log("The file was saved!");
            res.render('index', { title: 'success', error: '' });
        }); 
    });
    
    
});

app.listen(app.get('port'), function() {
    console.log("Node app is running at localhost:" + app.get('port'));
});


// helpers


function getFromSocrata(callback) {
    var sCosts = [];
    var sPageCount = 0;
    
    function getFromSocrataAux() {
        var inpatientRawSocrataURL = 'https://data.cms.gov/resource/xpsg-6hup.json';
        var inpatientSelect = '&$select=provider_id,average_covered_charges AS covered_charges,average_medicare_payments AS medicare_payments,total_discharges,drg_definition,average_total_payments AS total_payments';
        var appToken = '&$$app_token=mGcIawd37Jx9jP3guva8ugxoO';
        var url = inpatientRawSocrataURL + '?$limit=50000&$offset=' + (sPageCount * 50000)+ inpatientSelect + appToken;
        console.log('calling next page: ' + url);
        https.get(url, function(res) {
            console.log("Got response: " + res.statusCode);

            var output = '';
            res.on('data', function(chunk) {
                output += chunk;
            });

            res.on('end', function () {
                var data = JSON.parse(output);

                for(var i = 0; i < data.length; i++) {
                    sCosts.push(data[i]);
                }

                if(data.length === 50000) {
                    // we need to call again for more information
                    sPageCount++;
                    setTimeout(function() {
                        getFromSocrataAux();
                    }, Math.random()*800 + 300);
                } else {
                    return callback(sCosts);
                }
            });

        }).on('error', function(e) {
            console.log("Got error: " + e.message);
        });
    }
    
    return getFromSocrataAux();
    
}
                    