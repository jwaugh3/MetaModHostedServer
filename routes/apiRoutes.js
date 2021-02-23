const router = require('express').Router();
const request = require('request');
const jwt = require('jsonwebtoken');
const verifyToken = require('../jwt/jwt');
const { Users, FleamarketbotSettings } = require('../models/dbModels');
const bodyParser = require('body-parser');
var jsonParser = bodyParser.json()
const { modifyUsersArray, getUsersArray, client } = require('../apps/fleamarketbot/variables')

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





module.exports = {
    apiRoutes: router
}