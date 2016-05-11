'use strict';

var amqp = require('amqplib'),
    _ = require('lodash'),
    uuid = require('uuid');

var clientProto = {
    
    init: function(options) {
        options = options || {};
        
        this.host = options.url || 'localhost'; 
        this.queue = options.queue || 'rpc';
        
        this.channel = null;
        
        return this;
    },
    
    connect: function() {
        console.log('Server connecting to "%s"', this.uri());
        
        return amqp.connect(this.uri()).then(function(conn) {
            console.log('Server connected to "%s"', this.uri());    
            
            conn.on('error', function(err) {
                console.log('Server send error:', err.stack);
                this.reconnect();
            }.bind(this));
            
            return conn.createChannel().then(function(ch) {
                this.channel = ch;
            }.bind(this));
            
        }.bind(this)).catch(function(error) {
           console.log('Server error:', error.stack); 
        });
    },
    
    reconnect: function() {
        console.log('Server reconnecting');
        this.connect();  
    },
    
    uri: function() {
        return this.host.match(/amqps?:\/\//) ? this.host : ['amqp://', this.host].join('');
    },
    
    call: function(method, params, cb) {
        var msg = {type: method, params: params};
        var uid = uuid.v4();
        var replyQueue = null;
        
        this.connect().then(function() {
            this.channel.assertQueue('', {exclusive: true}).then(function(q) {
                replyQueue = q.queue;
                return this.channel.consume(replyQueue, function(message) {
                    if (message != null) {
                        var msg = JSON.parse(message.content.toString());
                        cb(msg);
                    }
                    this.channel.deleteQueue(replyQueue);
                }.bind(this));
            }.bind(this)).then(function() {                
                this.channel.sendToQueue(this.queue, new Buffer(JSON.stringify(msg)), {
                    correlationId: uid,
                    replyTo: replyQueue
                });
            }.bind(this));
        }.bind(this));
    }
};

var client = exports = module.exports = function(opts) {
    var proto = Object.create(clientProto).init(opts);
    return proto;
}