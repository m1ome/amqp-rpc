'use strict';

var amqp = require('amqplib'),
    _ = require('lodash'),
    uuid = require('uuid');

var serverProto = {
    
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
    
    on: function(e, callback) {
        this.connect().then(function() {
           this.channel.assertQueue(this.queue).then(function() {
               console.log('Listening to queue: "%s"', this.queue);
               
               this.channel.consume(this.queue, function(message) {
                   if (message != null) {
                       var msg = JSON.parse(message.content.toString());
                       
                       callback(null, msg, function(response) {
                           var resp = {response: response};
                           var options = message.properties;
                           
                           if (options.replyTo && options.correlationId) {
                               this.channel.sendToQueue(options.replyTo, new Buffer(JSON.stringify(resp)), {
                                  correlationId: options.correlationId 
                               });
                           }
                           
                           this.channel.ack(message);
                       }.bind(this));
                   }
               }.bind(this));
           }.bind(this));
        }.bind(this));
    },
};

var server = exports = module.exports = function(opts) {
    var proto = Object.create(serverProto).init(opts);
    return proto;
}