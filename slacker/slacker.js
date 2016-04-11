module.exports = function(RED) {
  'use strict';

  //var Botkit = require('botkit');

  function SlackBotControllerNode(n) {
      RED.nodes.createNode(this,n);

      // Configuration options passed by Node Red
      // TODO: make token 'credentials'
      this.name = n.name;
      this.token = n.token;

      var node = this;


      // Config node states
      node.connected = false;
      this.connecting = false;
      this.closing = false;

      //this.controller = Botkit.slackbot();
      //this.bot = this.controller.spawn({
      //  token: this.token
      //});

      // node.connecting = true;
      // node.bot.startRTM(function(err,bot,payload) {
      //   node.connecting = false;
      //   if (err) {
      //     //throw new Error('Could not connect to Slack');
      //     node.connected = false;
      //   }
      //   node.connected = true;
      // });

      this.on('close', function(done) {
            this.closing = true;
            // if (this.connected) {
            //     this.client.once('close', function() {
            //         done();
            //     });
            //     this.client.end();
            // } else {
                done();
            // }
        });
  }

  RED.nodes.registerType('slack-bot-controller',SlackBotControllerNode);

  function SlackInNode(n) {
      RED.nodes.createNode(this,n);

      this.controller = RED.nodes.getNode(n.controller);

      var node = this;

      this.on('input', function(msg) {
          msg.payload = msg.payload.toLowerCase();
          node.send(msg);
      });
  }
  RED.nodes.registerType('slack-in',SlackInNode);

  
};