const router = require('express').Router();
const queryString = require('querystring');
const request = require('request');
const { TwitchViewers } = require('../models/dbModels');
const jwt = require('jsonwebtoken');
const eventSubHandler = require('../eventSub/eventSub')
const { twitchBotSetup, getChannelMods } = require('../twitchBot/twitchBot')
require('dotenv').config()

baseURL = 'http://localhost:5000'
frontURL = 'http://localhost:3001'

TWITCH_AUTH_CONNECT_REDIRECT_URI = baseURL + '/connect/twitchRedirected'
LOGGED_IN_URI = frontURL + '/authorize'

//handles redirect user to twitch's authentication login
router.get('/twitch', (req, res) => {
	res.redirect(
		'https://id.twitch.tv/oauth2/authorize?' +
			queryString.stringify({
				client_id: process.env.TWITCH_CLIENT_ID, 
                redirect_uri: TWITCH_AUTH_CONNECT_REDIRECT_URI,
                response_type: 'code',
				scope: 'user:read:email',
                state: process.env.TWITCH_AUTH_STATE
			})
	);
});


//handles new and existing user login
router.get('/twitchRedirected', (req, res) => {

	//set variables
	var code = req.query.code;
	let state = req.query.state; 
	
	if(state !== process.env.TWITCH_AUTH_STATE){
        console.log('failed to login due to state')
		return
	}

    var options = {
        'method': 'POST',
		'url': `https://id.twitch.tv/oauth2/token?` +
				queryString.stringify({
					client_id: process.env.TWITCH_CLIENT_ID,
					redirect_uri: TWITCH_AUTH_CONNECT_REDIRECT_URI,
					client_secret: process.env.TWITCH_CLIENT_SECRET,
					grant_type: 'authorization_code',
					code: code
				})
      };

	request(options, (err, result, body) => {
		let bodyObject = JSON.parse(body)
		var accessToken = bodyObject.access_token
		var refreshToken = bodyObject.refresh_token;
		// console.log(accessToken)

		var headers = {
			'Authorization': 'Bearer ' + accessToken,
			'Client-Id': process.env.TWITCH_CLIENT_ID
		}; 

		var userOptions = {
			url: 'https://api.twitch.tv/helix/users',
			headers: headers
		} 

		request(userOptions, (err, result, body) => {
			console.log(JSON.parse(body))
			let userObject = JSON.parse(body).data 
			let twitch_ID = userObject[0].id
			

			TwitchViewers.findOne({ twitch_ID }).then(async(existingUser) => {
				if (existingUser) {
					//user exists
					if(existingUser.discord_username){
						res.redirect(LOGGED_IN_URI + '?twitchID=' + existingUser.twitch_ID + '&twitchLogin=' + existingUser.twitch_username  + '&discordID=' + existingUser.discord_ID + '&discordLogin=' + existingUser.discord_username + '&discriminator=' + existingUser.discord_discriminator);
					} else {
						res.redirect(LOGGED_IN_URI + '?twitchID=' + twitch_ID + '&twitchLogin=' + userObject[0].login);
					}
				} else {
					//create new user 
					new TwitchViewers({ 
                        twitch_ID,
                        twitch_username: userObject[0].login
					})
						.save() 
						.then((newUser) => {
                            console.log('new user created: ' + newUser.twitch_ID);
						}) 
						.then(() => {
                            res.redirect(LOGGED_IN_URI + '?twitchID=' + twitch_ID + '&twitchLogin=' + userObject[0].login);
						});
				}
			})
		}); 
	});
});


DISCORD_AUTH_REDIRECT_URI = baseURL + '/connect/discordRedirected'

//handles redirect user to twitch's authentication login
router.get('/discord', (req, res) => {
	res.redirect(
		'https://discord.com/api/oauth2/authorize?' +
			queryString.stringify({
				client_id: process.env.DISCORD_CLIENT_ID, 
                redirect_uri: DISCORD_AUTH_REDIRECT_URI,
                response_type: 'code',
				scope: 'guilds guilds.join identify',
                state: process.env.TWITCH_AUTH_STATE
			})
	);
});


//handles new and existing user login
router.get('/discordRedirected', (req, res) => {

	//set variables
	var code = req.query.code;

	var headers = {
		'Content-Type': 'application/x-www-form-urlencoded'
	}

	var options = {
		'url': `https://discord.com/api/oauth2/token`,
		form: {
			client_id: process.env.DISCORD_CLIENT_ID,
			client_secret: process.env.DISCORD_CLIENT_SECRET,
			grant_type: 'authorization_code',
			code: code,
			redirect_uri: DISCORD_AUTH_REDIRECT_URI,
			scope: 'guilds guilds.join identify'
		},
		headers: headers
	}

	request.post(options, (err, result, body) => {
		let bodyObject = JSON.parse(body)
		var accessToken = bodyObject.access_token
		var refreshToken = bodyObject.refresh_token;
		console.log(bodyObject)

		var headers = {
			'Authorization': 'Bearer ' + accessToken,
			'Client-Id': process.env.DISCORD_CLIENT_ID
		}; 

		var userOptions = {
			url: 'https://discord.com/api/v8/users/@me',
			headers: headers
		} 

		request(userOptions, (err, result, body) => {
			console.log(JSON.parse(body))
			let userObject = JSON.parse(body)			
						

			res.redirect(LOGGED_IN_URI + '?discordID=' + userObject.id + '&discordLogin=' + userObject.username + '&discriminator=' + userObject.discriminator)
		}); 
	});
});

DISCORD_BOT_REDIRECT_URI = baseURL + '/connect/discordBotRedirected'

//handles redirect user to twitch's authentication login
router.get('/discordBot', (req, res) => {
	res.redirect(
		'https://discord.com/api/oauth2/authorize?' +
			queryString.stringify({
				client_id: process.env.DISCORD_CLIENT_ID, 
                redirect_uri: DISCORD_BOT_REDIRECT_URI,
                response_type: 'code',
				scope: 'bot identify messages.read guilds.join',
                state: process.env.TWITCH_AUTH_STATE,
				permissions: '8'
			})
	);
});


//handles new and existing user login
router.get('/discordBotRedirected', (req, res) => {

	//set variables
	var code = req.query.code;

	var headers = {
		'Content-Type': 'application/x-www-form-urlencoded'
	}

	var options = {
		'url': `https://discord.com/api/oauth2/token`,
		form: {
			client_id: process.env.DISCORD_CLIENT_ID,
			client_secret: process.env.DISCORD_CLIENT_SECRET,
			grant_type: 'authorization_code',
			code: code,
			redirect_uri: DISCORD_BOT_REDIRECT_URI,
			scope: 'bot identify messages.read guilds.join',
			permissions: '8'
		},
		headers: headers
	}

	request.post(options, (err, result, body) => {
		let bodyObject = JSON.parse(body)
		var accessToken = bodyObject.access_token
		var refreshToken = bodyObject.refresh_token;
		console.log(bodyObject)
		let serverName = bodyObject.guild.name
		let serverID = bodyObject.guild.id


		var headers = {
			'Authorization': 'Bearer ' + accessToken,
			'Client-Id': process.env.DISCORD_CLIENT_ID
		}; 

		var userOptions = {
			url: 'https://discord.com/api/v8/users/@me',
			headers: headers
		} 

		request(userOptions, (err, result, body) => {
			console.log(JSON.parse(body))
			let userObject = JSON.parse(body)			
						
			res.redirect(LOGGED_IN_URI + '?discordID=' + userObject.id + '&discordLogin=' + userObject.username + '&discriminator=' + userObject.discriminator + '&serverName=' + serverName + '&serverID=' + serverID)
			
		}); 
	});
});



module.exports = {
	connectRoutes: router
}