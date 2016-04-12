module.exports = function(RED) {
  'use strict';

  var Botkit = require('botkit');

  function SlackBotControllerNode(n) {
    RED.nodes.createNode(this,n);

    this.log('SlackBotControllerNode ' + n.name + ' created');

    // Configuration options passed by Node Red
    // TODO: make token 'credentials'
    this.name = n.name;
    this.token = n.token;

    // Config node states
    this.connected = false;
    this.connecting = false;
    this.closing = false;
    this.subscriptions = {};

    this.controller = Botkit.slackbot({debug: false});

    var node = this;
    this.users = {};

    this.register = function(slackNode) {
      node.users[slackNode.id] = slackNode;
      if(Object.keys(node.users).length === 1) {
        node.connect();
      }
    };

    this.deregister = function(slackNode, done) {
      delete node.users[slackNode.id];
      if(node.closing) {
        return done();
      }
      if(Object.keys(node.users).length === 0) {
        if(node.bot) {
          return bot.closeRTM();
        }
      }
      done();
    };

    this.connect = function() {
      if(node.connected || node.connecting) {
        return;
      }

      node.connecting = true;
      node.bot = node.controller.spawn({ token: node.token });
      node.bot.startRTM(function(err, bot, payload){
        node.connecting = false;

        if(err) {
          node.error("Failed to connect", err);
          return;
        }

        node.connected = true;
        node.log(RED._("Slack RTM connected"));
        for(var id in node.users) {
          if(node.users.hasOwnProperty(id)) {
            node.users[id].status({fill:'green', shape:'dot', text:'Connected'});
          }
        }

        for(var s in node.subscriptions) {
          var event = s;
          for (var r in node.subscriptions[s]) {
            node.log(RED._("[BATCH] Handler for event" + s + " and ref " + r + " registered on controller."));

            node.controller.on(event, node.subscriptions[s][r].handler);
          }
        }

      });

    };

    this.subscribe = function(event, callback, ref) {
      node.log(RED._("Controller received subscription for " + event + " with ref " + ref));
      ref = ref||0;
      node.subscriptions[event] = node.subscriptions[event]||{};
      var sub = {
        event: event,
        handler:function(bot,message) {
          node.log(RED._("Handler for event" + event + " and ref " + ref + " received message: " + message));
          //This is a hack untill i know how to remove a listener on the controller
          if(node.subscriptions[event] && node.subscriptions[event][ref]) {
            node.log(RED._("Handler for event" + event + " and ref " + ref + " is calling its callback."));
            callback(bot, message);
          } else {
            node.log(RED._("Handler for event" + event + " and ref " + ref + " is not active anymore."));
          }
        },
        ref: ref
      };
      node.subscriptions[event][ref] = sub;
      if(node.connected) {
        node.log(RED._("Handler for event" + event + " and ref " + ref + " registered on controller."));
        node.controller.on(event, sub.handler);
      }
    };

    this.unsubscribe = function(event, ref) {
      ref = ref||0;
      var sub = node.subscriptions[event];
      if(!sub) {
        return;
      }
      if(sub[ref]) {
        delete sub[ref];
      }
      if(Objects.key(subs).length == 0) {
        delete node.subscriptions[event];
        if(node.connected) {
          // Do we need to tell the bot controller that we are not interested in this event anymore?
        }
      }

    };

    this.on('close', function(done) {
      this.closing = true;
      if (this.connected) {
        this.bot.destroy();
        done();
      } else {
        done();
      }
    });
  }

  RED.nodes.registerType('slack-bot-controller',SlackBotControllerNode);

  function SlackOutNode(n) {
    RED.nodes.createNode(this,n);

    this.channel = n.channel;
    this.controller = RED.nodes.getNode(n.controller);
    var node = this;

    if(!this.controller) {
      this.error(RED._("Missing slack bot controller"));
      return;
    }
    this.status({fill:"red",shape:"ring",text:"Disconnected"});

    this.on('input', function(msg){
      var m = {};
      m.channel = node.channel || msg.channel;
      if(!m.hasOwnProperty('channel')) {
        node.warn(RED._("Channel is missing"));
        return;
      }
      m.text = msg.payload;
      if(m.hasOwnProperty('text')){
        node.controller.bot.say(m);
      }
    });

    this.controller.register(this);

    if(this.controller.connected) {
      this.status({fill:"green",shape:"ring",text:"Connected"});
    }

    this.on('close', function(done) {
      if(!node.controller) {
        return done();
      }
      node.controller.deregister(node, done);
      
    });
    
  }
  RED.nodes.registerType('slack-out',SlackOutNode);

  function SlackInNode(n) {
    RED.nodes.createNode(this,n);

    this.events = (typeof(n.events) == 'string') ? n.events.split(/\,/g) : [];
    this.log(RED._("Slack in node regestering these events: " + this.events));
    this.controller = RED.nodes.getNode(n.controller);
    var node = this;

    if(!this.controller) {
      this.error(RED._("Missing slack bot controller"));
      return;
    }
    this.status({fill:"red",shape:"ring",text:"Disconnected"});
    
    if(!this.events || this.events.length == 0) {
      this.error(RED._("Event types not defined"));
      return;
    }

    this.controller.register(this);

    var callback = function(bot, message) {
      message.payload = message.text;
      node.send(message);
    };

    for (var e in this.events) {
      this.controller.subscribe(this.events[e], callback, node.id);
    }

    if(this.controller.connected) {
      this.status({fill:"green",shape:"ring",text:"Connected"});
    }

    this.on('close', function(done) {
      if(!node.controller) {
        return done();
      }
      for(var e in node.events) {
        node.controller.unsubscribe(this.events[e], node.id);
      }
      node.controller.deregister(node, done);
      
    });
    
  }
  RED.nodes.registerType('slack-in',SlackInNode);

};