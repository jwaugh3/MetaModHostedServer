const router = require('express').Router();
const request = require('request');
const jwt = require('jsonwebtoken');
const verifyToken = require('../jwt/jwt');
const { Users, TwitchViewers } = require('../models/dbModels');
const bodyParser = require('body-parser');
var jsonParser = bodyParser.json()
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