const router = require('express').Router();
const request = require('request');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
var jsonParser = bodyParser.json()
const { Users, ChannelPointRewards, TwitchViewers } = require('../../models/dbModels');
const verifyToken = require('../../jwt/jwt');
const rewardRedemptionHandler = require('../../apps/channelPointsManger/rewardRedemptionHandler')
const { customOptsArrayHandler } = require('../../twitchBot/twitchBot')
const { createDiscordRoles, deleteDiscordRoles } = require('../../discord/discordManager')
require('dotenv').config()

router.get('/verifyJWT/:token', verifyToken, (req, res) => {
    // console.log(req.params.token)
    jwt.verify(req.params.token, process.env.JWT_SECRET, (err, authData)=>{
        if(err) {
            res.json({error: "failed"})
          } else {
            res.json({verificationStatus: 'success'})
          }
    })
  })

//request handler - receives requests from ngrok
router.post('/event', jsonParser, (req, res)=>{

    //to validate that you own the callback you must return the challenge back to twitch
    if(req.body.challenge){
        res.send(req.body.challenge)
    } else {
        // console.log(req.body)
        if(req.body.subscription.type === 'channel.channel_points_custom_reward_redemption.add'){

            let eventData = req.body.event
            rewardRedemptionHandler(eventData)
        }
        //response to twitch with 2XX status code if successful (prevents multiple of the same notifications)
        res.send('2XX')
    }
})


  router.post('/createCustomRewards', jsonParser, (req, res)=>{

    Users.findOne({ login_username: req.body.channel }).then(async (existingUser)=>{
        if(existingUser){
            let twitchResponse = await generateNewAccessToken(existingUser.refresh_token)
            let accessToken = JSON.parse(twitchResponse)['access_token']

            var headers = {
                'client-id': process.env.TWITCH_CLIENT_ID,
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            };
            
            var dataString = JSON.stringify(req.body.data);
            // console.log(dataString)
            var options = {
                url: `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${existingUser.twitch_ID}`,
                method: 'POST',
                headers: headers,
                body: dataString
            };

            let newReward = await new Promise((resolve, reject)=> {
                request(options, (error, response)=>{
                    let data = JSON.parse(response.body)
                    if (!data.error) {
                        // console.log(data)
                        // console.log(data.data[0].max_per_stream_setting, data.data[0].max_per_user_per_stream_setting)
                        resolve(data)
                    } else {
                        console.log(data.error, 'error here')
                        res.json({response: data})
                    }
                })
            })

            let customSettings = req.body.settings
            customSettings.rewardID = newReward.data[0].id

            if(customSettings.rewardType === 'discordRank'){
                createDiscordRoles(JSON.parse(customSettings.settings))
            }

            ChannelPointRewards.findOneAndUpdate({ channel: req.body.channel }, 
                {"$push" : { 
                    'custom_rewards' : { 
                        'reward_id': customSettings.rewardID, 
                        'reward_type': customSettings.rewardType, 
                        'reward_settings' : customSettings.settings,
                        'redemptions' : []
                    }}}, 
                {new: true, useFindAndModify: false})
            .then((result)=>{
                if(result){
                   res.json({response: newReward.data[0]})
                } else {
                    console.log('createCustomRewards Api endpoint errored out when getting user from db')
                }
            })

        } else {
            console.log('createCustomRewards Api endpoint errored out when getting user from db')
        }
    })
})

router.post('/deleteCustomReward', jsonParser, (req, res)=>{

    Users.findOne({ login_username: req.body.channel }).then(async (existingUser)=>{
        if(existingUser){
            let twitchResponse = await generateNewAccessToken(existingUser.refresh_token)
            let accessToken = JSON.parse(twitchResponse)['access_token']
            
            var headers = {
                'Client-Id': process.env.TWITCH_CLIENT_ID,
                'Authorization': 'Bearer ' + accessToken
            };
            
            var options = {
                url: `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${existingUser.twitch_ID}&id=${req.body.id}`,
                method: 'DELETE',
                headers: headers
            };

            request(options, (error, response)=>{
                if (!error) {
                    res.json({response})
                } else {
                    console.log(error)
                }
            });

        } else {
            console.log('deleteCustomReward Api endpoint errored out when getting user from db')
        }
    })

    ChannelPointRewards.findOneAndUpdate({ channel: req.body.channel }, 
        {"$pull" : { 
            'custom_rewards' : { 
                'reward_id': req.body.id, 
            }}}, 
        {new: false, useFindAndModify: false})
    .then((response)=>{
        if(response){
            let rewardIndex = response.custom_rewards.findIndex((x)=> x.reward_id === req.body.id)
            if(response.custom_rewards[rewardIndex].reward_type === 'discordRank'){
                deleteDiscordRoles(JSON.parse(response.custom_rewards[rewardIndex].reward_settings))

                TwitchViewers.updateMany({'rank.rewardID': req.body.id},
                {"$pull" : { 
                    'rank' : { 
                        'rewardID': req.body.id, 
                    }}},
                    {new: true, useFindAndModify: false}
                )
                .then((result)=>{
                    // console.log(result)
                })
            }
        } else {
            console.log('createCustomRewards Api endpoint errored out when getting user from db')
        }
    })

    
    
})

router.get('/getCustomReward/:channel/:manageable', (req, res)=>{

    Users.findOne({ login_username: req.params.channel }).then(async (existingUser)=>{
        if(existingUser){
            let twitchResponse = await generateNewAccessToken(existingUser.refresh_token)
            let accessToken = JSON.parse(twitchResponse)['access_token']

            var headers = {
                'Client-Id': process.env.TWITCH_CLIENT_ID,
                'Authorization': 'Bearer ' + accessToken
            };
             
            var options = {
                url: `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${existingUser.twitch_ID}&only_manageable_rewards=${req.params.manageable}`,
                headers: headers
            };

            // gets all custom rewards
            request(options, (error, response)=>{   
                res.json(JSON.parse(response.body))
            })

        } else {
            console.log('getCustomReward Api endpoint errored out when getting user from db')
        }
    })
})

router.post('/updateCustomReward', jsonParser, (req, res)=>{

    Users.findOne({ login_username: req.body.channel }).then(async (existingUser)=>{
        if(existingUser){
            let twitchResponse = await generateNewAccessToken(existingUser.refresh_token)
            let accessToken = JSON.parse(twitchResponse)['access_token']

            var headers = {
                'client-id': process.env.TWITCH_CLIENT_ID,
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            };

            var dataString = JSON.stringify(req.body.data);
            // console.log(dataString)
            var options = {
                url: `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${existingUser.twitch_ID}&id=${req.body.rewardID}`,
                method: 'PATCH',
                headers: headers,
                body: dataString
            };

            let updatedTwitchStatus = await new Promise((resolve, reject)=>{
                
                request(options, (error, response)=>{
                    if (!JSON.parse(response.body).error) {
                        // console.log(response.body)
                        resolve(response.body)
                    } else {
                        resolve(JSON.parse(response.body))
                    }
                })
            })

            let updateStatus = {}

            if(!updatedTwitchStatus.error){
                updateStatus = await new Promise((resolve, reject)=>{
                    ChannelPointRewards.findOneAndUpdate({ channel: req.body.channel, 'custom_rewards.reward_id': req.body.settings.rewardID }, 
                        {'$set' : {'custom_rewards.$.reward_settings' : req.body.settings.settings}}, 
                        {new: true, useFindAndModify: false}
                    )
                    .then(async (res)=>{
                        // console.log(res, 'res')
                        resolve(res)
                    })
                })
            }

            res.json({twitchStatus: updatedTwitchStatus, updateStatus})

        } else {
            console.log('updateCustomRewards Api endpoint errored out when getting user from db')
        }
    })
})


router.get('/getRewardSettings/:channel', (req, res)=>{
// console.log('got reward settings')
    ChannelPointRewards.findOne({ channel: req.params.channel }, {_id: 0, __v: false}).then((existingUser)=>{
        if(existingUser){
            res.json(existingUser)
        } else {
            console.log('getRewardSettings Api endpoint errored out when getting user from db')
        }
    })
})

router.get('/getRewardEntries/:channel/:rewardID', (req, res)=>{
    // console.log('got reward settings')
        ChannelPointRewards.findOne({ channel: req.params.channel, 'custom_rewards.reward_id': req.params.rewardID}, {_id: 0, __v: false}).then((existingReward)=>{
            if(existingReward){
                // console.log(existingReward)
                let rewardIndex = existingReward.custom_rewards.findIndex((x)=>x.reward_id === req.params.rewardID)
                res.json({rewardID: existingReward.custom_rewards[rewardIndex].reward_id, userEntries: existingReward.custom_rewards[rewardIndex].redemptions})
            } else {
                console.log('getRewardSettings Api endpoint errored out when getting user from db')
            }
        })
    })

router.get('/getWinners/:channel/:rewardID', async(req, res)=>{

    let winners = await new Promise((resolve, reject)=>{
        ChannelPointRewards.findOne({ channel: req.params.channel, 'custom_rewards.reward_id': req.params.rewardID}, {_id: 0, __v: false}).then(async(res)=>{
            if(res){
console.log(res)
        let rewardIndex = res.custom_rewards.findIndex((x)=> x.reward_id === req.params.rewardID)
                if(res.custom_rewards[rewardIndex].winners.length > 0){
                    resolve(res.custom_rewards[rewardIndex].winners)
                } else {
                    let redemptions = res.custom_rewards[rewardIndex].redemptions
                    let setWinners = []
                    let winnerCount = JSON.parse(res.custom_rewards[rewardIndex].reward_settings).winnerCount
                    giveawayStatus = JSON.parse(res.custom_rewards[rewardIndex].reward_settings).completed

                    if(giveawayStatus === true && winnerCount < redemptions.length){
                        for(let x=0; x<winnerCount && setWinners !== winnerCount; x++){
                            let chosenWinner = redemptions[Math.floor(Math.random() * redemptions.length)] //select random winner from redemptions array
                            if(!setWinners.includes(chosenWinner)) { //if winner hasn't already been chosen
                                setWinners.push(chosenWinner)
                            } else {
                                setWinners.push(redemptions[Math.floor(Math.random() * redemptions.length)])
                            }
                        }

                        let completedGiveaway = await new Promise((resolve, reject)=>{
                            ChannelPointRewards.findOneAndUpdate({ channel: req.params.channel, 'custom_rewards.reward_id': req.params.rewardID }, 
                                {'$set' : {'custom_rewards.$.winners' : setWinners}}, 
                                {new: true, useFindAndModify: false}
                            ).then((res)=>{

                                let winnersIndex = res.custom_rewards.findIndex((x)=> x.reward_id === req.params.rewardID)
                                let winnersArray = res.custom_rewards[winnersIndex].winners
                                if(winnersArray.length > 2){
                                    let listedUsers = winnersArray
                                    let last = listedUsers.pop()
                                    resultList = listedUsers.join(', ') + ' and ' + last
                                } else if(winnersArray.length === 2){
                                    resultList = winnersArray[0] + ' and ' + winnersArray[1]
                                } else {
                                    resultList = winnersArray
                                }

                                let userOpts = customOptsArrayHandler('get', req.params.channel)
                                let command = 'The Giveaway has ended and the winners are: ' + resultList + '. Please respond in chat to claim your prize.'
                                userOpts.client.say(event.broadcaster_user_login, command)

                                resolve(res)
                            })
                        })

                        resolve(completedGiveaway.custom_rewards[0].winners)
                    }
                }
                
            } else {
                console.log('getRewardSettings Api endpoint errored out when getting user from db')
            }
        })
    })

    res.json(winners)
})
    


router.get('/reroll/:channel/:rewardID/:user', async(req, res)=>{
    
    let winners = await new Promise((resolve, reject)=>{
        ChannelPointRewards.findOne({ channel: req.params.channel, 'custom_rewards.reward_id': req.params.rewardID}, {_id: 0, __v: false}).then(async(res)=>{
            if(res){
                let rewardIndex = res.custom_rewards.findIndex((x)=> x.reward_id === req.params.rewardID)
                let redemptions = res.custom_rewards[rewardIndex].redemptions
                let setWinners = res.custom_rewards[rewardIndex].winners
                giveawayStatus = JSON.parse(res.custom_rewards[rewardIndex].reward_settings).completed

                let index = setWinners.findIndex((x)=>x === req.params.user)
                let rerolled = redemptions[Math.floor(Math.random() * redemptions.length)]
                while(setWinners.includes(rerolled)){
                    rerolled = redemptions[Math.floor(Math.random() * redemptions.length)]
                }
                setWinners[index] = rerolled

                let completedGiveaway = await new Promise((resolve, reject)=>{
                    ChannelPointRewards.findOneAndUpdate({ channel: req.params.channel, 'custom_rewards.reward_id': req.params.rewardID }, 
                        {'$set' : {'custom_rewards.$.winners' : setWinners}}, 
                        {new: true, useFindAndModify: false}
                    ).then((res)=>resolve(res))
                })

                resolve(completedGiveaway.custom_rewards[rewardIndex].winners)
                
                
            } else {
                console.log('reroll Api endpoint errored out when getting user from db')
            }
        })
    })

    res.json(winners)
})

router.get('/getMods/:channel', async(req, res)=>{
    // console.log('hit')
    let mods = await new Promise((resolve, reject)=>{
        Users.findOne({ login_username: req.params.channel}).then(async(res)=>{
            if(res){
                
                let mods = res.mods
                resolve(mods)
            } else {
                console.log('getMods Api endpoint errored out when getting user from db')
            }
        })
    })

    res.json(mods)
})


module.exports = {
    channelPointsManagerRoutes: router
}