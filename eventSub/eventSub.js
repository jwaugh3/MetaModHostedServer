const request = require('request')
const express = require('express');
const queryString = require('querystring');
const bodyParser = require('body-parser');
var jsonParser = bodyParser.json()
require('dotenv').config()

//server setup
const app = express();

const clientID = process.env.TWITCH_CLIENT_ID
const clientSecret = process.env.TWITCH_CLIENT_SECRET
const callbackURL = 'https://894b92ec0a05.ngrok.io'



const getAppAccessToken = async () => {
//get app access token

    var tokenOptions = {
        url: `https://id.twitch.tv/oauth2/token?` + 
            queryString.stringify({
                client_id: clientID,
                client_secret: clientSecret,
                grant_type: 'client_credentials',
                scope: 'channel:read:redemptions' // modify this depending on your subscription types(if providing multiple, separate with a space: ' ')
            }),
        method: 'POST'
    };

    let appAccessToken = await new Promise((resolve, reject)=>{
        
        request(tokenOptions, (error, response)=>{
            console.log(response.body)
            if(!error){
                resolve(JSON.parse(response.body).access_token)
            } else {
                console.log(error)
            }
        })
    })
console.log(appAccessToken)
    return appAccessToken
}  


const validateToken = async (appAccessToken) => {
//validate app access token
    var headers = {
        'Authorization': 'OAuth ' + appAccessToken
    };
    
    var validationOptions = {
        url: 'https://id.twitch.tv/oauth2/validate',
        headers: headers
    };

    let isTokenValid = await new Promise((resolve, reject)=> {
        request(validationOptions, (error, response)=>{
            let parsedResponse = JSON.parse(response.body)

            if(!parsedResponse.status){
                resolve(true)
            } else {
                resolve(false)
            }
        })
    })

    return isTokenValid
}

            
const createNewSubscription = async (appAccessToken, broadcaster_id, subscriptionType) => {

    var subscriptionHeaders = {
        'Client-ID': clientID,
        'Authorization': 'Bearer ' + appAccessToken,
        'Content-Type': 'application/json'
    };

    var dataString = JSON.stringify({
        "type": subscriptionType,
        "version": "1",
        "condition": {
            "broadcaster_user_id": broadcaster_id
        },
        "transport": {
            "method": "webhook",
            "callback": callbackURL + "/channelPointsManager/event", // -- endpoint must mast express endpoint
            "secret": "testtesttest" //your secret
        }
    })
    
    var subscriptionOptions = {
        url: 'https://api.twitch.tv/helix/eventsub/subscriptions',
        method: 'POST',
        headers: subscriptionHeaders,
        body: dataString
    };

    let newSubscriptionCreated = await new Promise((resolve, reject)=>{
        request(subscriptionOptions, (error, response)=>{
            let parsedResponse = JSON.parse(response.body)
            
            if(!parsedResponse.error){
                resolve(parsedResponse)
            } else {
                console.log(parsedResponse)
            }

        })
    })

    return newSubscriptionCreated
}


const getAllSubscriptions = async (appAccessToken) => {
//get all existing subscriptions

    var headers = {
        'Client-ID': clientID,
        'Authorization': 'Bearer ' + appAccessToken
    };
    
    var getListOptions = {
        url: 'https://api.twitch.tv/helix/eventsub/subscriptions',
        headers: headers
    };

    let allSubscriptions = await new Promise((resolve, reject)=>{
        request(getListOptions, (error, response)=>{
            let parsedResponse = JSON.parse(response.body)
            if(!parsedResponse.error){
                resolve(parsedResponse)
            } else {
                console.log(parsedResponse)
            }
            
        })
    })

    return allSubscriptions
}


const deleteSubscription = async (appAccessToken, subscriptionID) => {

    var headers = {
        'Client-ID': clientID,
        'Authorization': 'Bearer ' + appAccessToken
    };
    
    var deleteOptions = {
        url: 'https://api.twitch.tv/helix/eventsub/subscriptions?id=' + subscriptionID,
        method: 'DELETE',
        headers: headers
    };

    let deletionStatus = await new Promise((resolve, reject)=>{
        request(deleteOptions, (error, response)=>{
            if(response.body === ''){
               resolve('successessfully deleted sub of id: ' + subscriptionID)
            } else {
                console.log(response.body)
            }
        })
    })

    return deletionStatus
}


//Handles all function calls
const eventSubHandler = async (broadcaster_id, action, subscriptionType) => {

    let appAccessToken = await getAppAccessToken()

    let isTokenValid = await validateToken(appAccessToken)

    if(!isTokenValid){
        //if app access token is invalid then get a new one
        appAccessToken = await getAppAccessToken()
    }

    //broadcaster_id and subscriptionType should be set for your specific requirements
    // let broadcaster_id = '533135185' // the channel you would like the subscription set up on
    // let subscriptionType = 'channel.channel_points_custom_reward_redemption.add' // the type of subscription you would like   ref: https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types
    //creates new subscription
    if(action === 'create'){
        let newSubscription = await createNewSubscription(appAccessToken, broadcaster_id, subscriptionType)
    }

    if(action === 'get'){
        let subscriptionList = await getAllSubscriptions(appAccessToken)
        console.log(subscriptionList)
    }

    //deletes first subscription in subscriptionList -- change 'subscriptionList.data[0].id with the id of the specific subscription you would like deleted
    // let runDelete = false //set to true if you want to run deletion sequence
    if(action === 'delete'){
        let subscriptionList = await getAllSubscriptions(appAccessToken)
        console.log(subscriptionList)
        
        let deletionStatus = await deleteSubscription(appAccessToken, subscriptionList.data[0].id)
        console.log(deletionStatus)
    }
}

// eventSubHandler('533135185', 'create', 'channel.channel_points_custom_reward_redemption.add')

module.exports = eventSubHandler
