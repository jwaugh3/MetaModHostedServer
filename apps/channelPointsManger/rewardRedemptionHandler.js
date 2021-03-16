const request = require("request")
const { ChannelPointRewards, TwitchViewers } = require("../../models/dbModels")
const { optsArrayHandler, customOptsArrayHandler } = require('../../twitchBot/twitchBot')
const { setDiscordRank, checkGuildForUser } = require('../../discord/discordManager')

const rewardRedemptionHandler = async (event) => {
// console.log(event, 'event')

    let redeemedReward = await new Promise((resolve, reject)=>{
        ChannelPointRewards.findOne({channel: event.broadcaster_user_login}).then((result)=>{
            let rewardIndex = result.custom_rewards.findIndex((x) => x.reward_id === event.reward.id)
            resolve(result.custom_rewards[rewardIndex])
        })
    })

    // console.log(redeemedReward)

//Giveaway Redemption
    if(redeemedReward.reward_type === 'giveaway'){

        let currentRedemptions = redeemedReward.redemptions
        currentRedemptions.push(event.user_name)
        // console.log(currentRedemptions)
        ChannelPointRewards.findOneAndUpdate({ channel: event.broadcaster_user_login, 'custom_rewards.reward_id': event.reward.id }, //store username of redeemers
            {'$set' : {'custom_rewards.$.redemptions' : currentRedemptions}}, 
            {new: true, useFindAndModify: false})
        .then((result)=>{
            if(result){
            
            } else {
                console.log('createCustomRewards Api endpoint errored out when getting user from db')
            }
        })
    }

//VIP Redemption
    if(redeemedReward.reward_type === 'vip'){

        let currentRedemptions = redeemedReward.timedRedemptions
        currentRedemptions.push({user: event.user_name, redeemedAt: new Date()})
        // console.log(currentRedemptions)
        ChannelPointRewards.findOneAndUpdate({ channel: event.broadcaster_user_login, 'custom_rewards.reward_id': event.reward.id }, //store username of redeemers
            {'$set' : {'custom_rewards.$.timedRedemptions' : currentRedemptions}}, 
            {new: true, useFindAndModify: false})
        .then((result)=>{
            // console.log(result)
            if(result){
                //if successful
                let userOpts = optsArrayHandler('get', event.broadcaster_user_login)
                let command = '/vip ' + event.user_login 
                userOpts.client.say(userOpts.opts.identity.username, command)
                

            } else {
                console.log('createCustomRewards Api endpoint errored out when getting user from db')
            }
        })
    }

//Timeout Redemption
    if(redeemedReward.reward_type === 'timeout'){

        var options = {
            url: `https://tmi.twitch.tv/group/user/${event.broadcaster_user_login}/chatters`
        };

        // gets all custom rewards
        let allUsers = await new Promise((resolve, reject)=>{
            request(options, (error, response)=>{   
               resolve(JSON.parse(response.body))
            })
        })
        // console.log(allUsers)
        let userTypes = JSON.parse(redeemedReward.reward_settings).eligible
        let numberOfChatters = JSON.parse(redeemedReward.reward_settings).numberOfChatters
        userTypes = userTypes.map((x)=>{return x.toLowerCase()})
        allUsers.chatters['mods'] = allUsers.chatters['moderators'] //rename response from moderators to mods to match application
        delete allUsers.chatters['moderators']
        let timeoutLength = JSON.parse(redeemedReward.reward_settings).timeoutLength

        let userPool = []
        for(let key in allUsers.chatters){
            if(userTypes.includes(key)){
                userPool.push(...allUsers.chatters[key])
            }
        }
        // console.log(allUsers, userPool)
        let selectedUsers = []

        let metaBotOpts = customOptsArrayHandler('get')

        for(let y=0; (y < numberOfChatters); y++){
            let randomIndex = Math.floor(Math.random() * userPool.length)
            let user = userPool[randomIndex]
            selectedUsers.push(user)
            userPool.splice(randomIndex, 1)
            let command = '/timeout ' + user + ' ' + timeoutLength + 's'
            metaBotOpts.client.say(event.broadcaster_user_login, command)
        }

        let resultList

        if(selectedUsers.length > 2){
            let listedUsers = selectedUsers
            let last = listedUsers.pop()
            resultList = listedUsers.join(', ') + ' and ' + last
        } else if(selectedUsers.length === 2){
            resultList = selectedUsers[0] + ' and ' + selectedUsers[1]
        } else {
            resultList = selectedUsers
        }

        let confirmCommand = event.user_name + ' has redeemed "' + event.reward.title + '" and has timed out ' + resultList + ' for ' + timeoutLength + 's'
        metaBotOpts.client.say(event.broadcaster_user_login, confirmCommand)
    }

//Discord Rank Redemption
    if(redeemedReward.reward_type === 'discordRank'){
        TwitchViewers.findOne({twitch_username: event.user_login.toLowerCase()}).then((existingUser)=>{
            let rewardSettings = JSON.parse(redeemedReward.reward_settings)
            // console.log(rewardSettings, 'rewardSettings')
            let rankNames = rewardSettings.rankNames
            let rankColors = rewardSettings.rankColors
            let rankIDs = rewardSettings.rankIDs
            let serverName = rewardSettings.serverName
            let serverID = rewardSettings.serverID
            let ownerLogin = rewardSettings.ownerLogin
            let ownerID = rewardSettings.ownerID
            let discriminator = rewardSettings.discriminator

            

            if(existingUser){
                let rankSettings = existingUser.rank.find((x)=>x.rewardID === event.reward.id)
                // console.log(rankSettings, 'ranksettings')
                //check if they already are ranked for this reward id
                //if ranked already, then rank up and update rank in discord
                if(rankSettings){ //if rank already exists
                    let currentRankIndex = rewardSettings.rankNames.indexOf(rankSettings.rankName)
                    // console.log(currentRankIndex)
                    let newRankIndex = currentRankIndex + 1
                    let newRankName = rewardSettings.rankNames[newRankIndex]
                    let newRankColor = rewardSettings.rankColors[newRankIndex]

                    if(newRankName){ //if rank exists and next rank available, then rank up
                        TwitchViewers.findOneAndUpdate({ twitch_username: event.user_login.toLowerCase(), 'rank.rewardID': event.reward.id }, 
                            {'$set' : {'rank.$.rankName' : newRankName, 'rank.$.rankColor' : newRankColor}}, 
                            {new: true, useFindAndModify: false})
                        .then(async(result)=>{
                            // console.log(result)
                            //if highest rank, tell in chat
                            //otherwise tell current rank
                            let rankSettings = result.rank.find((x)=> x.rewardID === event.reward.id)
                            // console.log(rankSettings)
                            if(rankSettings.rankName === rewardSettings.rankNames[rewardSettings.rankNames.length - 1]){
                                let userOpts = customOptsArrayHandler('get', event.broadcaster_user_login)
                                let command = '@' + event.user_login + ' You are now the highest rank possible in Discord. Congrats! Enjoy the clout!'
                                userOpts.client.say(event.broadcaster_user_login, command)
                            } else {
                                let userOpts = customOptsArrayHandler('get', event.broadcaster_user_login)
                                let command = '@' + event.user_login + " You've ranked up in Discord! You are now ranked: " + rankSettings.rankName
                                userOpts.client.say(event.broadcaster_user_login, command)
                            }

                            //check for user in server
                            let userCheck = await checkGuildForUser(rankSettings.serverID, result.discord_ID)
                            if(!userCheck){//if user is not in server, tell them to join server to gain rank
                                let userOpts = customOptsArrayHandler('get', event.broadcaster_user_login)
                                let command = '@' + event.user_login + " Join the discord server ("+ rankSettings.serverName +") to gain your new rank."
                                userOpts.client.say(event.broadcaster_user_login, command)
                            } else {
                                //give new rank
                                setDiscordRank(rankSettings.serverID, result.discord_ID, rankSettings.rankName, rankNames[newRankIndex - 1])
                            }
                        })
                    } else { // if rank is maxed out
                        // say in chat that the user maxed out their discord ranking
                        let userOpts = customOptsArrayHandler('get', event.broadcaster_user_login)
                        let command = '/me @' + event.user_login + ' you already maxed out your rank... You might want a refund.'
                        userOpts.client.say(event.broadcaster_user_login, command)
                    }
                }
                //if not ranked, add rank details and then rank up in discord
                else { 
                    TwitchViewers.findOneAndUpdate({ twitch_username: event.user_login.toLowerCase() }, 
                    {"$push" : { 
                        'rank' : { 
                            serverName,
                            serverID,
                            ownerLogin,
                            discriminator,
                            ownerID,
                            channel: event.broadcaster_user_login,
                            channelID: event.broadcaster_user_id,
                            rewardID: event.reward.id,
                            rankName: rankNames[0],
                            rankColor: rankColors[0]
                        }}},
                    {new: true, useFindAndModify: false}).then(async(response)=>{
                        // console.log(event)
                        let rankSettings = response.rank.find((x)=> x.rewardID === event.reward.id)
                        let userOpts = customOptsArrayHandler('get', event.broadcaster_user_login)
                        let command = '@' + event.user_login + ' Congrats! You have ranked up in Discord! You are now ranked: ' + rankNames[0]
                        userOpts.client.say(event.broadcaster_user_login, command)

                        let userCheck = await checkGuildForUser(rankSettings.serverID, response.discord_ID)
                        if(!userCheck){//if user is not in server, tell them to join server to gain rank
                            let userOpts = customOptsArrayHandler('get', event.broadcaster_user_login)
                            let command = '@' + event.user_login + " Join the discord server ("+ rankSettings.serverName +") to gain your new rank."
                            userOpts.client.say(event.broadcaster_user_login, command)
                        } else {
                            //give new rank
                            setDiscordRank(rankSettings.serverID, response.discord_ID, rankSettings.rankName, null)
                        }
                        
                    })
                }

            } else {
                //if user does not exist in db, create user
                new TwitchViewers({
                    twitch_ID: event.user_id,
                    twitch_username: event.user_login.toLowerCase(),
                    rank: [{
                        serverName,
                        serverID,
                        ownerLogin,
                        discriminator,
                        ownerID,
                        channel: event.broadcaster_user_login,
                        channelID: event.broadcaster_user_id,
                        rewardID: event.reward.id,
                        rankName: rankNames[0],
                        rankColor: rankColors[0]
                    }]
                }).save()

                //send message in chat telling them where to connect their account
                let userOpts = customOptsArrayHandler('get', event.broadcaster_user_login)
                let command = '@' + event.user_login + ' visit https://metamoderation.com/connect to connect your discord account and gain your new Discord Rank!'
                userOpts.client.say(event.broadcaster_user_login, command)
                
            }
        })
    }
}


const redemptionTimer = async() => {
console.log('we ran it at: ', new Date().getHours())
    let redemptionsToExecute = await new Promise((resolve, reject)=>{
        ChannelPointRewards.find({}, 'channel').select('custom_rewards').then((res)=>{
            let actionsToExecute = []
            res.forEach((channel)=>{
                let actionInfo = {}

                channel.custom_rewards.forEach((reward)=>{
                    reward.timedRedemptions.forEach((redemption)=>{
                        let statusLength = parseInt(JSON.parse(reward.reward_settings).statusLength)
                        
                        if(redemption.redeemedAt.getTime() + statusLength*60*60*1000 < new Date().getTime()){
                            actionInfo.channel = channel.channel
                            actionInfo.reward_type = reward.reward_type
                            actionInfo.user = redemption.user
                            actionInfo.redeemedAt = redemption.redeemedAt
    
                            actionsToExecute.push(actionInfo)
                        }
                    })
                })

            })

            resolve(actionsToExecute)
        })
    })

    setTimeout(()=>{
        redemptionsToExecute.forEach(async(redemption)=>{
            if(redemption.reward_type === 'vip'){
                let userOptions = await optsArrayHandler('get', redemption.channel)
                let command = '/unvip ' + redemption.user
                userOptions.client.say(redemption.channel, command)
            }
        })
    }, 6000)

}


const runEveryFullHours = (callbackFn) => {
    const Hour = 60 * 60 * 1000;
    const currentDate = new Date();
    const firstCall =  Hour - (currentDate.getMinutes() * 60 + currentDate.getSeconds()) * 1000 + currentDate.getMilliseconds();

    setTimeout(() => {
        callbackFn();
        setInterval(callbackFn, Hour);
    }, firstCall);
};

runEveryFullHours(redemptionTimer)


module.exports = rewardRedemptionHandler