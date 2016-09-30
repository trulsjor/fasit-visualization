var express = require('express');
var app = express();
var request = require('request-promise')

app.use(express.static('public'))

app.get('/app/:app.:envclass.:env', function (req, res) {

    var uri = 'https://fasit.adeo.no/api/v2/applicationinstances?' +
        'environment=' + req.params.env +
        '&environmentclass=' + req.params.envclass +
        '&application=' + req.params.app
    '&usage=true';


    request(uri)
        .then(function (body) {
            var json = JSON.parse(body);

            var answer = {
                application: json[0].application,
                environment: json[0].environment,
                version: json[0].version
            }

            json.map(e =>Promise
                .all(e.usedresources.map(resource => lookup(resource)))
                .then(values => {
                    answer.children = values.filter(entry => entry.application);
                    res.send(answer);
                }));
        });
});


function lookup(e) {
    return new Promise(
        function (resolve, reject) {
            request(e.ref, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    if (JSON.parse(body).exposedby) {
                        var json = JSON.parse(body);
                        resolve({
                            type: json.type,
                            alias: json.alias,
                            application: json.exposedby.application,
                            version: json.exposedby.version,
                            environment: json.exposedby.environment
                        })
                    }
                    resolve({});

                }
                reject(response.statusCode);

            });
        }
    )
}

app.listen(3000, function () {
    console.log('started');
});