const Discord = require('discord.js');
const client = new Discord.Client();
const RoleManager = new Discord.RoleManager(client)
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
            console.log(result.name)
        })
    })
}

const deleteDiscordRoles = (settings) => {
    console.log(settings)
    settings.rankIDs.forEach((id, index)=>{
        console.log(settings.rankNames[index])
        client.guilds.cache.get(settings.serverID).roles.cache.find((x)=>x.name === settings.rankNames[index]).delete()
    })
}

client.once('ready', ()=>{

})


client.login(process.env.DISCORD_BOT_TOKEN)

module.exports = {
    createDiscordRoles,
    deleteDiscordRoles,
    setDiscordRank
}