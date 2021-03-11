//Runs on startup of server
const tmi = require('tmi.js')
const { Users, TwitchViewers } = require('../models/dbModels');
const request = require('request')

let optsArray = []
let customOptsArray

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

      Users.findOne({login_username: channel.toLowerCase()}).then((user)=>{
        if(!user.mods.find((x)=>x.user_login === 'metamoderation')){
            client.say(channel, '/mod metamoderation')  

            getChannelMods(twitch_ID, accessToken)
        }
    })
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

const customTwitchBotSetup = async (channel, accessToken) =>{
    var opts = defaultOpts
    opts.identity.username = 'metamoderation'
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

        if(msg.startsWith('!rank')){
            TwitchViewers.findOne({twitch_username: user.username}).then((existingUser)=>{
                console.log(target)
                let rankSettings = existingUser.rank.find((x)=> '#' + x.channel === target)
                client.say(target, '@' + user.username + " Your current discord rank is: " + rankSettings.rankName)
            })
        }
    }
    
    // Register our event handlers (defined below)
    client.on('chat', onMessageHandler);
    client.on('connected', onConnectedHandler);
    
    // Called every time the bot connects to Twitch chat
    function onConnectedHandler (addr, port) {
      console.log(`* Connected to ${addr}:${port}`);
    }

    customOptsArray = {opts, client}
}

const customOptsArrayHandler = (action) => {
    if(action === 'get'){
        return customOptsArray
    }
}


const getChannelMods = async (id, accessToken) => {
    var headers = {
        'Authorization': 'Bearer ' + accessToken,
        'Client-Id': process.env.TWITCH_CLIENT_ID
    };
    
    var options = {
        url: 'https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=' + id,
        headers: headers
    };

    request(options, (err, result, body) => {
        let currentMods = JSON.parse(body).data
        
        Users.findOneAndUpdate({ twitch_ID: id }, //store username of mods
            {'$set' : {'mods' : currentMods}}, 
            {new: true, useFindAndModify: false})
        .then((result)=>{
            if(result){
                // console.log(result)
            } else {
                console.log('createCustomRewards Api endpoint errored out when getting user from db')
            }
        })
    })
}

const twitchBotRestart = async () => {

    //bot initialization
    let results = await Users.find({}, {_id: 0, __v: 0})

    var counter = 0
    var x = setInterval( async ()=>{
        let tokenData = await generateNewAccessToken(results[counter].refresh_token)
        let accessToken = JSON.parse(tokenData).access_token
        // console.log(accessToken, results[counter])
        twitchBotSetup(results[counter].login_username, accessToken)

        if(counter === results.length-1){
            clearInterval(x)
        }
        counter ++
    }, 2000)

}

const customTwitchBotRestart = async () => {
    //bot initialization
    let results = await Users.find({}, {_id: 0, __v: 0})

    var counter = 0
    var x = setInterval( async ()=>{
        let accessToken = '4tw1v563eyc5760b0yoill7hdr9awl'
        let channel = results[counter].login_username
        console.log(channel)
        customTwitchBotSetup(channel, accessToken)

        if(counter === results.length-1){
            clearInterval(x)
        }
        counter ++
    }, 2000)


}

module.exports = {
    twitchBotSetup,
    optsArrayHandler,
    customTwitchBotSetup,
    customOptsArrayHandler,
    getChannelMods,
    twitchBotRestart,
    customTwitchBotRestart
}