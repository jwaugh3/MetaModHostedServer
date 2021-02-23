const successfulPriceResponse = (client, target, user, targetRequester, resultData) => {

    if(resultData.result.price_per_slot !== 0){
      if(targetRequester === true){
        client.say(target, '@' + user['display-name'] + " The price of '" + `${resultData.result.item_name.replace("&amp;", "&")}` + "' is " + `${resultData.result.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}` + "₽" + " at " + `${resultData.result.price_per_slot.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}` + "₽ per slot.")
      } else {
        client.say(target, "/me The price of '" + `${resultData.result.item_name.replace("&amp;", "&")}` + "' is " + `${resultData.result.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}` + "₽" + " at " + `${resultData.result.price_per_slot.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}` + "₽ per slot.")
      }
    }
    else if(resultData.result.price_per_slot === 0){
      if(targetRequester === true){
        client.say(target, '@' + user['display-name'] + " The price of '" + `${resultData.result.item_name.replace("&amp;", "&")}` + "' is " + `${resultData.result.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}` + "₽")
      } else {
        client.say(target, "/me The price of '" + `${resultData.result.item_name.replace("&amp;", "&")}` + "' is " + `${resultData.result.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}` + "₽")
      }
    }
}


const successfulTradeResponse = (client, target, user, targetRequester, resultData) => {

    if(resultData.result.trader_currency === 'roubles' && resultData.result.trader){
      currency = '₽'
      if(targetRequester ===  true){
        client.say(target, "@" + user['display-name'] + ' ' + resultData.result.trader + " has the highest trade-in value of '" + `${resultData.result.item_name.replace("&amp;", "&")}` + "' at " + `${resultData.result.trader_price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}` + currency)
      } else {
        client.say(target, "/me " + resultData.result.trader + " has the highest trade-in value of '" + `${resultData.result.item_name.replace("&amp;", "&")}` + "' at " + `${resultData.result.trader_price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}` + currency)
      }
      } else if(resultData.result.trader_currency === 'dollar' && resultData.result.trader){
        currency = '$'
        if(targetRequester === true){
          client.say(target, "@" + user['display-name'] + ' ' + resultData.result.trader + " has the highest trade-in value of '" + `${resultData.result.item_name.replace("&amp;", "&")}` + "' at " + currency + `${resultData.result.trader_price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`)
        } else {
          client.say(target, "/me " + resultData.result.trader + " has the highest trade-in value of '" + `${resultData.result.item_name.replace("&amp;", "&")}` + "' at " + currency + `${resultData.result.trader_price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`)
        }
      } else if(resultData.result.trader_currency === 'euro' && resultData.result.trader){
        currency = '€'
        if(targetRequester === true){
          client.say(target, "@" + user['display-name'] + ' ' + resultData.result.trader + " has the highest trade-in value of '" + `${resultData.result.item_name.replace("&amp;", "&")}` + "' at " + `${resultData.result.trader_price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}` + currency)
        } else {
          client.say(target, "/me " + resultData.result.trader + " has the highest trade-in value of '" + `${resultData.result.item_name.replace("&amp;", "&")}` + "' at " + `${resultData.result.trader_price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}` + currency)
        }
      }
}

module.exports = {
    successfulPriceResponse,
    successfulTradeResponse
}