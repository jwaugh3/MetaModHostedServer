const { ChannelPointRewards } = require("../../models/dbModels")
const { optsArrayHandler } = require('../../twitchBot/twitchBot')

const rewardRedemptionHandler = async (event) => {
console.log(event, 'event')

    let redeemedReward = await new Promise((resolve, reject)=>{
        ChannelPointRewards.findOne({channel: event.broadcaster_user_login}).then((result)=>{
            let rewardIndex = result.custom_rewards.findIndex((x) => x.reward_id === event.reward.id)
            resolve(result.custom_rewards[rewardIndex])
        })
    })

    console.log(redeemedReward)

    if(redeemedReward.reward_type === 'giveaway'){

        let currentRedemptions = redeemedReward.redemptions
        currentRedemptions.push(event.user_name)
        console.log(currentRedemptions)
        ChannelPointRewards.findOneAndUpdate({ channel: event.broadcaster_user_login, 'custom_rewards.reward_id': event.reward.id }, //store username of redeemers
            {'$set' : {'custom_rewards.$.redemptions' : currentRedemptions}}, 
            {new: true, useFindAndModify: false})
        .then((result)=>{
            if(result){
            //    res.json({response: newReward.data[0]})
            } else {
                console.log('createCustomRewards Api endpoint errored out when getting user from db')
            }
        })
    }


    if(redeemedReward.reward_type === 'vip'){

        let currentRedemptions = redeemedReward.timedRedemptions
        currentRedemptions.push({user: event.user_name, redeemedAt: new Date()})
        console.log(currentRedemptions)
        ChannelPointRewards.findOneAndUpdate({ channel: event.broadcaster_user_login, 'custom_rewards.reward_id': event.reward.id }, //store username of redeemers
            {'$set' : {'custom_rewards.$.timedRedemptions' : currentRedemptions}}, 
            {new: true, useFindAndModify: false})
        .then((result)=>{
            console.log(result)
            if(result){
                console.log('ran in here')
                //if successful
                let userOpts = optsArrayHandler('get', event.broadcaster_user_login)
                let command = '/vip ' + event.user_login 
                userOpts.client.say(userOpts.opts.identity.username, command)
                

            } else {
                console.log('createCustomRewards Api endpoint errored out when getting user from db')
            }
        })
    }


}


const redemptionTimer = async() => {
console.log('we ran it at: ', new Date().getHours())
    let redemptionsToExecute = await new Promise((resolve, reject)=>{
        ChannelPointRewards.find({}, 'channel').select('custom_rewards').then((res)=>{
            let actionsToExecute = []
            res.forEach((channel)=>{
                let actionInfo = {}

                channel.custom_rewards.forEach((reward)=>{
                    reward.timedRedemptions.forEach((redemption)=>{
                        let statusLength = parseInt(JSON.parse(reward.reward_settings).statusLength)
                        
                        if(redemption.redeemedAt.getTime() + statusLength*60*60*1000 < new Date().getTime()){
                            actionInfo.channel = channel.channel
                            actionInfo.reward_type = reward.reward_type
                            actionInfo.user = redemption.user
                            actionInfo.redeemedAt = redemption.redeemedAt
    
                            actionsToExecute.push(actionInfo)
                        }
                    })
                })

            })

            resolve(actionsToExecute)
        })
    })

    setTimeout(()=>{
        redemptionsToExecute.forEach(async(redemption)=>{
            if(redemption.reward_type === 'vip'){
                let userOptions = await optsArrayHandler('get', redemption.channel)
                let command = '/unvip ' + redemption.user
                userOptions.client.say(redemption.channel, command)
            }
        })
    }, 6000)

}


const runEveryFullHours = (callbackFn) => {
    const Hour = 60 * 60 * 1000;
    const currentDate = new Date();
    const firstCall =  Hour - (currentDate.getMinutes() * 60 + currentDate.getSeconds()) * 1000 + currentDate.getMilliseconds();

    setTimeout(() => {
        callbackFn();
        setInterval(callbackFn, Hour);
    }, firstCall);
};

runEveryFullHours(redemptionTimer)


module.exports = rewardRedemptionHandler