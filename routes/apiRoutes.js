const router = require('express').Router();
const request = require('request');
const jwt = require('jsonwebtoken');
const verifyToken = require('../jwt/jwt');
const { Users, FleamarketbotSettings, TwitchViewers } = require('../models/dbModels');
const bodyParser = require('body-parser');
var jsonParser = bodyParser.json()
const { modifyUsersArray, getUsersArray, client } = require('../apps/fleamarketbot/variables');
const { setDiscordRank, userConnectHandler } = require('../discord/discordManager');

require('dotenv').config()

//verify jwt token
router.get('/verifyJWT/:token', verifyToken, (req, res) => {
  console.log(req.params.token)
  jwt.verify(req.params.token, process.env.JWT_SECRET, (err, authData)=>{
      if(err) {
          res.json({error: "failed"})
        } else {
          res.json({verificationStatus: 'success'})
        }
  })
})

router.get('/getChannel/:token', verifyToken, (req, res) => {
  jwt.verify(req.params.token, process.env.JWT_SECRET, (err, authData)=>{
      if(err) {
          res.json({error: "failed"})
        } else {
          Users.findOne({twitch_ID: authData.userData.twitchID}).then((result)=>{
            res.json({channel: result.login_username, type: result.broadcaster_type})
          })
        }
  })
})

router.get('/getFleamarketbotSettings/:token', verifyToken, (req, res) => {
  jwt.verify(req.params.token, process.env.JWT_SECRET, (err, authData)=>{
      if(err) {
          res.json({error: "failed"})
        } else {
          
          Users.findOne({twitch_ID: authData.userData.twitchID}).then((result)=>{
            FleamarketbotSettings.findOne({channel: result.login_username}, {_id: 0, __v: 0}).then((response)=>{
              res.json(response)
            })
          })

        }
  })
})

router.post('/updateFleamarketbot/:token', jsonParser, verifyToken, (req, res) => {
  jwt.verify(req.params.token, process.env.JWT_SECRET, async (err, authData)=>{
    if(err) {
      res.json({error: "failed"})
    } else {

      let channel = await new Promise((resolve, reject)=>{
        Users.findOne({twitch_ID: authData.userData.twitchID})
        .then((data)=>{
            resolve(data)
        })
        .catch((err)=>{
            console.log(err)
        })
      })

      var settings = req.body.settings

      newSettings = {
        channel: channel.login_username,
        mode: settings.modeSelection,
        delay: parseInt(settings.delay),
        lastTriggered: new Date(),
        targetRequester: settings.targetRequester,
        channelConnected: settings.channelConnected,
        lastChanged: settings.lastChanged,
        tier: settings.tier
      }

      modifyUsersArray('update', channel.login_username, newSettings)

      res.status(200).send({'success': 'success'})
    }
  })
})

router.post('/updateChannel/:token', jsonParser, verifyToken, (req, res) => {
  jwt.verify(req.params.token, process.env.JWT_SECRET, async (err, authData)=>{
    if(err) {
      res.json({error: "failed"})
    } else {

      console.log('received', req.body)

      let botSettings = req.body.settings
      botSettings.lastChanged = new Date()

      await FleamarketbotSettings.findOneAndUpdate({channel: botSettings.channel}, {
        channelConnected: botSettings.channelConnected,
        lastChanged: botSettings.lastChanged
      }, {new: true, useFindAndModify: false}).then((res)=>console.log(res))

      modifyUsersArray('channelName', null, botSettings)

    }
  })
})


router.post('/connection', jsonParser, (req, res) => {
console.log(req.body)
console.log('/connection was hit')
  TwitchViewers.findOneAndUpdate({ twitch_ID: req.body.data.twitchID }, 
    {
      discord_ID: req.body.data.discordID, 
      discord_username: req.body.data.discordLogin, 
      discord_discriminator: req.body.data.discordDiscriminator
    }, 
    {new: true, useFindAndModify: false}).then((result)=>{
        console.log(result)
        if(result){
          
          if(result.rank.length > 0){
            result.rank.forEach((rank)=>{

              //check if user is already in server, if they are
              userConnectHandler(rank.serverID, req.body.data.discordID, req.body.data.token, rank.rankName, null)

            })
          }

          

          res.json(result)
        }
  })

})

router.get('/getUser/:username', (req, res) => {       
  TwitchViewers.findOne({twitch_username: req.params.username}).then((result)=>{
    res.json(result)
  })
})




module.exports = {
    apiRoutes: router
}