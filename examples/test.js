'use strict';

var server = require('./../index.js').server({
    host: 'amqp://localhost',
    queue: 'rpc'
});

var client = require('./../index.js').client({
    host: 'amqp://localhost',
    queue: 'rpc'    
});

server.on('test', function(err, req, cb) {
    console.log('Got request:', req);
    cb({a: 10, b: 100});
});

client.call('test', {name: "Ivan"}, function(response) {
    console.log('Got response:', response);
});


// Message
// {"name": "test", "params": {"i": 1}}