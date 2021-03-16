const Discord = require('discord.js');
const client = new Discord.Client();
const RoleManager = new Discord.RoleManager(client)
const request = require('request');
const { TwitchViewers } = require('../models/dbModels');
require('dotenv').config()


const setDiscordRank = async(serverID, userID, rank, previousRank) => {
    let guild = client.guilds.cache.get(serverID)
    let role = guild.roles.cache.find((x)=> x.name === rank)

    let previousRole

    if(previousRank){
        previousRole = guild.roles.cache.find((x)=> x.name === previousRank)
    }
    
    let member = guild.members.fetch(userID).then((member)=>{
        if(previousRank){
            member.roles.remove(previousRole)
        }

        member.roles.add(role)
    })
}



const createDiscordRoles = (settings) => {
    settings.rankIDs.forEach((id, index)=>{
        client.guilds.cache.get(settings.serverID).roles
        .create({
                data: {
                    name: settings.rankNames[index],
                    color: settings.rankColors[index],
                    hoist: true
                },
                reason: 'Rank created by MetaMod'
            })
        .then((result)=>{
            // console.log(result.name)
        })
    })
}

const deleteDiscordRoles = (settings) => {
    // console.log(settings)
    settings.rankIDs.forEach((id, index)=>{
        // console.log(settings.rankNames[index])
        client.guilds.cache.get(settings.serverID).roles.cache.find((x)=>x.name === settings.rankNames[index]).delete()
    })
}

const checkGuildForUser = async(serverID, userID) => {
    //check if user is in server
    var headers = {
        'Authorization': 'Bot ' + process.env.DISCORD_BOT_TOKEN,
        'Client-Id': process.env.DISCORD_CLIENT_ID,
        'Content-Type': 'application/x-www-form-urlencoded'
    }; 

    var userOptions = {
        'url': `https://discord.com/api/v8/guilds/${serverID}/members/${userID}`,
        headers: headers
    } 

    let userCheck = await new Promise((resolve, reject)=>{
        request.get(userOptions, (error, response) => {
            // console.log(JSON.parse(response.body))
            let userData = JSON.parse(response.body)
            if(userData.message){
                resolve(false)
            } else {
                resolve(true)
            }
        })
    })

    return userCheck
}

const getGuildRoleID = async(serverID, rank) => {
    var headers = {
        'Authorization': 'Bot ' + process.env.DISCORD_BOT_TOKEN,
        'Client-Id': process.env.DISCORD_CLIENT_ID,
        'Content-Type': 'application/x-www-form-urlencoded'
    }; 

    var userOptions = {
        'url': `https://discord.com/api/v8/guilds/${serverID}/roles`,
        headers: headers
    } 
    let roleID = await new Promise((resolve, reject)=>{
        request.get(userOptions, (err, result, body) => {
            // console.log(JSON.parse(body))
            let roles = JSON.parse(body)
    
            let roleIndex = roles.findIndex((x)=> x.name === rank)
            resolve(roles[roleIndex].id)
        })
    })

    return roleID
}

const addUserToGuild = async(serverID, userID, accessToken) => {
    var headers = {
        'Authorization': 'Bot ' + process.env.DISCORD_BOT_TOKEN,
        'Client-Id': process.env.DISCORD_CLIENT_ID,
        'Content-Type': 'application/json'
    }; 

    var userOptions = {
        'url': `https://discord.com/api/v8/guilds/${serverID}/members/${userID}`,
        headers: headers,
        json: {'access_token': accessToken}
    } 
    let joinStatus = await new Promise((resolve, reject)=>{
        request.put(userOptions, (err, result, body) => {
            if(body.message){
                resolve('error')
            } else {
                // console.log(body, 'here')
                resolve('success')
            }
        })
    })

    return joinStatus
}

const userConnectHandler = async (serverID, userID, accessToken, rank, previousRank) => {

    let userCheck = await checkGuildForUser(serverID, userID)
    // console.log(userCheck)

    if(!userCheck){//if user is not in server, add them
        //get role ID for user
        let roleID = await getGuildRoleID(serverID, rank)
        
        let joinStatus = await addUserToGuild(serverID, userID, accessToken, roleID)
        // console.log(joinStatus)
    } else {
        setDiscordRank(serverID, userID, rank, previousRank)
    }
}

client.on('ready', ()=>{
    // userConnectHandler('776560072867446795', '820264052911243275', 'RFghPZek7svu9tpCBHe82TbsCxM2vg', 'Level 1 - Bronze')
    // console.log('im ready')
})

//run when someone joins the server to check for rank and award rank
client.on('guildMemberAdd', (member)=>{
    TwitchViewers.findOne({discord_ID: member.user.id}).then((user)=>{
        let rankIndex = user.rank.findIndex((x)=> x.serverID === member.guild.id)
        let rankData = user.rank[rankIndex]

        setDiscordRank(member.guild.id, user.discord_ID, rankData.rankName, null)
    })
})

client.login(process.env.DISCORD_BOT_TOKEN)

module.exports = {
    createDiscordRoles,
    deleteDiscordRoles,
    setDiscordRank,
    userConnectHandler,
    checkGuildForUser
}