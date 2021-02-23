const stringSimilarity = require('string-similarity')
const { Items } = require('../../models/dbModels');

let z = 0

const itemSearch = async (requestedItem) => {
    var inputStore = requestedItem
    let input = requestedItem.split(' ')

    //gets all items in the db that include part of the requested item name
    var resultsToCompare = []
    for(let x=0; x<input.length; x++){
        if(input[x].includes("-")){input[x] = input[x].replace("-","")}

        await Items.find({command_line: new RegExp(input[x])}).then(async (items)=>{
          items.forEach(element => resultsToCompare.push(element))

            if(items.length === 0){ //IF NO MATCH IS FOUND FROM 'LIKE' query
                const compareArray = [] //temp storage for database data

                await Items.find({}).then((databaseItems)=>{
                    console.log(databaseItems.length)
                    for(y=0; y<databaseItems.length; y++){
                        compareArray.push(databaseItems[y].command_line)
                      }
                })

                const similarity = stringSimilarity.findBestMatch(input[x], compareArray)
        
                Items.find({command_line: new RegExp(similarity.bestMatch.target)}).then((items)=>{
                    items.forEach(element => resultsToCompare.push(element))
                })
            }
        })
    }

    var itemNamesToCompare = []
    resultsToCompare.forEach(element => itemNamesToCompare.push(element.command_line)) //get all of the results command lines
    var tempStringArray = []
    var finalCompare = []

    itemNamesToCompare.forEach((command, index)=>{ //split results into an array that can be searched through by stringSimilarity
        if(command.includes(',')){
            tempStringArray = command.split(',')
            tempStringArray.forEach((name) => finalCompare.push(name))
        } else {
            finalCompare.push(command)
        }
    })   

    if(finalCompare.length === 0){
        return {status: 'failed'}
    }

    var similarity = stringSimilarity.findBestMatch(inputStore.toString().replace(/,/g, ""), finalCompare) //finds the best match out of all of the results

    var itemLocation = ''
    resultsToCompare.forEach((result, index)=>{ //returns the location(in resultsToCompare) of the best result
        if(result.command_line.includes(similarity.bestMatch.target)){
            itemLocation = index
        }
    })

    let status 

    if(similarity.bestMatch.rating < 0.5){
        status = 'failed'
    } else {
        status = 'success'
    }

    return {status, inputStore: inputStore, result: resultsToCompare[itemLocation]}
}


module.exports = {
    itemSearch
}