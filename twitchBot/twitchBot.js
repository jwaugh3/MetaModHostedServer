//Runs on startup of server
const tmi = require('tmi.js')
const { Users } = require('../models/dbModels');

let optsArray = []

const defaultOpts = {
    connection: {
      reconnect: true
      },
    identity: {
        username: "",
        password: ""
    },
    channels: [
      ''
    ]
};

const twitchBotSetup = async (channel, accessToken) => {

    var opts = defaultOpts
    opts.identity.username = channel
    opts.identity.password = 'oauth:' + accessToken
    opts.channels[0] = '#' + channel

    // Create a client with our options
    var client = new tmi.client(opts);

    // Connect to Twitch:
    client.connect();

    console.log('joined', channel)
 
    //message handler
    const onMessageHandler = async (target, user, msg, self) => { 
        if (self) { return; } // Ignore messages from the bot
        if(msg.includes(";")){ return }
    }
    
    // Register our event handlers (defined below)
    client.on('chat', onMessageHandler);
    client.on('connected', onConnectedHandler);
    
    // Called every time the bot connects to Twitch chat
    function onConnectedHandler (addr, port) {
      console.log(`* Connected to ${addr}:${port}`);
    }

    optsArray.push({opts, client})
}

const optsArrayHandler = (action, channel) => {
    if(action === 'get'){
        let channelIndex = optsArray.findIndex((x)=>x.opts.identity.username === channel)
        if(channelIndex !== -1){
            return optsArray[channelIndex]
        }
    }
}

module.exports = {
    twitchBotSetup,
    optsArrayHandler
}