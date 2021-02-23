const request = require('request')
const { Users } = require('../models/dbModels')
const { twitchBotSetup } = require('./twitchBot')
require('dotenv').config()

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

twitchBotRestart = async () => {

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

module.exports = {
    getChannelMods,
    twitchBotRestart
}