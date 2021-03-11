const router = require('express').Router();
const queryString = require('querystring');
const request = require('request');
const { Users, ChannelPointRewards } = require('../models/dbModels');
const jwt = require('jsonwebtoken');
const eventSubHandler = require('../eventSub/eventSub')
const { twitchBotSetup } = require('../twitchBot/twitchBot')
const { getChannelMods } = require('../twitchBot/twitchBot')
const { optsArrayHandler } = require('../twitchBot/twitchBot')
require('dotenv').config()

baseURL = 'http://localhost:5000'
frontURL = 'http://localhost:3001'

TWITCH_AUTH_REDIRECT_URI = baseURL + '/auth/redirected'
LOGGED_IN_URI = frontURL + '/authorize'

//handles redirect user to twitch's authentication login
router.get('/login', (req, res) => {
	console.log('first')
	res.redirect(
		'https://id.twitch.tv/oauth2/authorize?' +
			queryString.stringify({
				client_id: process.env.TWITCH_CLIENT_ID, 
                redirect_uri: TWITCH_AUTH_REDIRECT_URI,
                response_type: 'code',
				scope: 'chat:read chat:edit channel_commercial user:read:email moderation:read channel:moderate channel:manage:redemptions channel:read:redemptions',
                state: process.env.TWITCH_AUTH_STATE
			})
	);
});


//handles new and existing user login
router.get('/redirected', (req, res) => {

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
					redirect_uri: TWITCH_AUTH_REDIRECT_URI,
					client_secret: process.env.TWITCH_CLIENT_SECRET,
					grant_type: 'authorization_code',
					code: code
				})
      };

	request(options, (err, result, body) => {
		console.log('hit here')
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
			

			Users.findOne({ twitch_ID }).then(async(existingUser) => {

				if (existingUser) {
					//user exists
					console.log(existingUser)
					console.log('existing user:', existingUser.display_name);

					getChannelMods(twitch_ID, accessToken)

					let newToken = await new Promise((resolve, reject) => {
						Users.findOneAndUpdate({twitch_ID}, {refresh_token: refreshToken,last_sign_in: new Date()}, {new: true, useFindAndModify: false})
						.then(async (res)=>{
							if(res.error){reject('error')}
							let token = await generateNewAccessToken(res.refresh_token)
							resolve(token)
						}).catch((err)=>{
							reject(err)
						})
					})
					let tempAccessToken = JSON.parse(newToken)

					let userData = {
						twitchID: twitch_ID,
						access_token: tempAccessToken.access_token
					}
					
					jwt.sign({userData}, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
						res.redirect(LOGGED_IN_URI + '?token=' + token);
					  });

				} else {
					//create new user 
					new Users({ 
						twitch_ID: userObject[0].id.toString(), 
						login_username: userObject[0].login, 
						display_name: userObject[0].display_name, 
						broadcaster_type: userObject[0].broadcaster_type,
						profile_image: userObject[0].profile_image_url,
						email: userObject[0].email,
						refresh_token: refreshToken,
						last_sign_in: new Date(),
						created_on: new Date()
					})
						.save() 
						.then(async (newUser) => {
                            console.log('new user created: ' + newUser.twitch_ID);

							//setup event Sub for new user
							eventSubHandler(newUser.twitch_ID, 'create', 'channel.channel_points_custom_reward_redemption.add')

							//get channel moderators
							await getChannelMods(twitch_ID, accessToken)

							await twitchBotSetup(newUser.login_username, accessToken)

							// await customTwitchBotSetup(newUser.login_username, '4tw1v563eyc5760b0yoill7hdr9awl')

							//create channel_point_rewards
							new ChannelPointRewards({
								channel: newUser.login_username,
								custom_rewards: []
							}).save()
						}) 
						.then(() => {

							let userData = {
								twitchID: twitch_ID,
								access_token: accessToken
							}

							jwt.sign({userData}, process.env.JWT_SECRET, { expiresIn: '24d' }, (err, token) => {
								console.log(token)
								res.redirect(LOGGED_IN_URI + '?token=' + token);
							  });
						});
				}
			})
		}); 
	});
});


//--------------------------------------Functional Assets
generateNewAccessToken = async (refreshToken) => {
	//set variables
	// console.log(refreshToken);
	var options = {
        'method': 'POST',
		'url': `https://id.twitch.tv/oauth2/token?` +
				queryString.stringify({
					grant_type:'refresh_token',
					refresh_token: refreshToken,
					client_id: process.env.TWITCH_CLIENT_ID,
					client_secret: process.env.TWITCH_CLIENT_SECRET
				})
      };

	return new Promise((resolve, reject) => {
		request(options, (err, response, body) => {
			if (err) {
				reject(err);
			} else {
				// console.log(body)
				resolve(body);
			}
		});
	});
};

generateNewAccessToken = async (refreshToken) => {
	//set variables
	// console.log(refreshToken);
	var options = {
        'method': 'POST',
		'url': `https://id.twitch.tv/oauth2/token?` +
				queryString.stringify({
					grant_type:'refresh_token',
					refresh_token: refreshToken,
					client_id: process.env.TWITCH_CLIENT_ID,
					client_secret: process.env.TWITCH_CLIENT_SECRET
				})
      };

	return new Promise((resolve, reject) => {
		request(options, (err, response, body) => {
			if (err) {
				reject(err);
			} else {
				// console.log(body)
				resolve(body);
			}
		});
	});
};

// generateUserToken = () => {
// 	const genUserToken = randomString.generate(32);
// 	return genUserToken;
// };

// encryptUserToken = (userToken) => {
// 	let encryptedToken = cryptoJS.AES.encrypt(userToken, process.env.COOKIE_KEY).toString();
// 	return encryptedToken;
// };

// decryptUserToken = (encryptedToken) => {
// 	let bytes = cryptoJS.AES.decrypt(encryptedToken, process.env.COOKIE_KEY);
// 	let userToken = bytes.toString(cryptoJS.enc.Utf8);
// 	return userToken;
// };



module.exports = {
	authRoutes: router,
	generateNewAccessToken
}