var express = require('express');
var _ = require('lodash')
var app = express();
var request = require('request-promise')

app.use(express.static('public'))


app.get('/app/:app/:env', function (req, res) {


    var uri = 'https://fasit.adeo.no/api/v2/applicationinstances?' +
        'environment=' + req.params.env +
        '&application=' + req.params.app + '&usage=true';


    console.log(uri);
    request(uri)
        .then(function (body) {
            var json = JSON.parse(body);

            var answer = {
                application: json[0].application,
                environment: json[0].environment,
                version: json[0].version
            }


            function flatten(arr){
                return arr.reduce((a,b) => a.concat(Array.isArray(b) ? flatten(b) : b), []);
            }

            json.map(e => Promise
                .all(e.usedresources.map(resource => lookup(resource)).concat(e.exposedresources.map(resource => lookup2(resource))))
                .then(values => {
                    values = flatten(values);
                    answer.needs = values
                        .filter(entry => entry.application)
                        .filter(entry => entry.direction==='needs')
                        .reduce(function (memo, entry) {
                            for (i = 0; i < memo.length; i++) {
                                if (memo[i].application === entry.application) {
                                    memo[i].resources.push({
                                        'type': entry.type,
                                        'alias': entry.alias
                                    })
                                    return memo;
                                }
                            }

                            //optimizing the following co is left as an excercise for the reader.
                            memo.push(toResource(entry))
                            return memo;
                        }, []);
                    answer.neededBy = values
                        .filter(entry => entry.direction==='neededBy')
                        .reduce(function (memo, entry) {
                            for (i = 0; i < memo.length; i++) {
                                if (memo[i].application === entry.application) {
                                    memo[i].resources.push({
                                        'type': entry.type,
                                        'alias': entry.alias
                                    })
                                    return memo;
                                }
                            }

                            //optimizing the following co is left as an excercise for the reader.
                            memo.push(toResource(entry))
                            return memo;
                        }, []);


                    res.send(answer);
                }));

         /*   json.map(e => Promise
                .all(e.exposedresources.map(resource => lookup2(resource)))
                .then(values => {
                    answer. neededBy = values
                        .filter(entry => entry.application)
                        .reduce(function (memo, entry) {
                            for (i = 0; i < memo.length; i++) {
                                if (memo[i].application === entry.application) {
                                    memo[i].resources.push({
                                        'type': entry.type,
                                        'alias': entry.alias
                                    })
                                    return memo;
                                }
                            }
                            //optimizing the following co is left as an excercise for the reader.
                            memo.push(toResource(entry))
                            return memo;
                        }, []);

                    res.send(answer);
                }))*/
        });
});


function toResource(entry) {
    return {
        application: entry.application,
        environment: entry.environment,
        version: entry.version,
        resources: [{
            type: entry.type,
            alias: entry.alias
        }]
    };
}

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
                            environment: json.exposedby.environment,
                            direction: "needs"
                        })
                    }
                    resolve({});

                }
                reject(response.statusCode);

            });
        }
    )
}

function lookup2(e) {
    return new Promise(
        function (resolve, reject) {
            request(e.ref, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    if (JSON.parse(body).usedbyapplications) {
                        var json = JSON.parse(body);
                        resolve(json.usedbyapplications.map(function (app) {
                            return {
                                type: json.type,
                                alias: json.alias,
                                application: app.application,
                                version: app.version,
                                environment: app.environment,
                                direction: "neededBy"
                            }
                        }))
                    }
                    resolve([]);

                }
                reject(response.statusCode);

            });
        }
    )
}


app.listen(3000, function () {
    console.log('started');
});