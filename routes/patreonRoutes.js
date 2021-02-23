const router = require('express').Router();
const queryString = require('querystring');
const request = require('request');
const { Users, PatreonUsers, FleamarketbotSettings } = require('../models/dbModels');
const patreonUserUpdate = require('../patreon/patreonUserUpdate');
const jwt = require('jsonwebtoken');
const bot = require('../apps/fleamarketbot/fleamarketbot')
const variables = require('../apps/fleamarketbot/variables')
require('dotenv').config()


REDIRECT_URI = 'http://localhost:5000/patreon/auth'
LOGGED_IN_URI = 'http://localhost:3001/authenticate'

//handles redirect user to twitch's authentication login
router.get('/login', (req, res) => {
	res.redirect(
		'https://www.patreon.com/oauth2/authorize?' +
			queryString.stringify({
				client_id: process.env.PATREON_CLIENT_ID, 
                redirect_uri: REDIRECT_URI,
                response_type: 'code',
                scope: 'identity identity[email] identity.memberships campaigns.members',
                state: req.query.token
			})
	);
});


//handles new and existing user login
router.get('/auth', async (req, res) => {

	//set variables
	var code = req.query.code;
	let state = req.query.state; 

	var authData = await new Promise((resolve, reject) => {
		jwt.verify(state, process.env.JWT_SECRET, (err, authData)=>{
			resolve(authData)
		})
	})
    
    var options = {
        'method': 'POST',
		'url': `https://www.patreon.com/api/oauth2/token?` +
				queryString.stringify({
					client_id: process.env.PATREON_CLIENT_ID,
					redirect_uri: REDIRECT_URI,
					client_secret: process.env.PATREON_CLIENT_SECRET,
					grant_type: 'authorization_code',
					code: code
				})
      };

	request(options, async (err, result, body) => {
		let bodyObject = JSON.parse(body)
		var accessToken = bodyObject.access_token
		var refreshToken = bodyObject.refresh_token;
        

		var options = {
			'method': 'GET',
			'url': 'https://www.patreon.com/api/oauth2/api/current_user',
			'headers': {
				'Authorization': 'Bearer ' + accessToken
			}
		};

		await request(options,  async (error, response, body) => {
			let userData = JSON.parse(body).data.attributes

			let patreonData = await patreonUserUpdate()

			var specificUser
			for(let y=0; y<patreonData.length; y++){
				if(patreonData[y].email === userData.email){
					specificUser = patreonData[y]
				}
			}

			if(specificUser.currently_entitled_amount_cents === 499){
				specificUser.tier = 'standard'
			} else {
				specificUser.tier = 'premium'
			}

			let botSettings = await new Promise(async (resolve, reject)=>{
				await Users.findOneAndUpdate({twitch_ID: authData.userData.twitchID}, 
					{
						patreon_full_name: specificUser.full_name,
						patreon_email: userData.email, 
						patreon_tier: specificUser.tier,
						patreon_status: specificUser.patron_status
					}, 
					{new: true, useFindAndModify: false})
						.then((res)=>{
							console.log('added bot')
							//set up fleamarketbot here
							bot.client.join('#' + res.login_username)						
							//add user to fleamarketbot settings storage
							let lastChanged = new Date()
							lastChanged.setMonth(lastChanged.getMonth()-2)

							let botSettings = {
								channel: res.login_username,
								mode: 'allchat',
								delay: 0,
								lastTriggered: new Date(),
								targetRequester: false,
								channelConnected: res.login_username,
								lastChanged: lastChanged,
								tier: res.patreon_tier
							}

							new FleamarketbotSettings(botSettings).save()
							.then(()=>{
								//add user to usersArray
								variables.modifyUsersArray('add', null, botSettings)
							})

							resolve(botSettings)
						})
			})

					res.redirect(LOGGED_IN_URI + "?settings=" + JSON.stringify(botSettings));
		})
	})
});


module.exports = {
	patreonRoutes: router
}