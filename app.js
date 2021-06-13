const Discord = require('discord.js');
const dateFormat = require('dateformat');
require('dotenv').config();
const fetch = require('node-fetch');
const HTMLParser = require('node-html-parser');
const Sequelize = require('sequelize');

const help = require('./help').help;


// Database setup
const sequelize = new Sequelize('database','user','hackmebaby',{
    host: 'localhost',
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false
});

/**The bot object*/
const client = new Discord.Client();
client.login(process.env.BOT_TOKEN).then((token) => {
    client.user.setPresence({
     activity: { name: '%help' },
     status: 'online',
    });
   });
/** Command prefix */
const PREFIX = '%';

// On recived message
client.on('message', (msg)=>{
    if (msg.content.startsWith(PREFIX)){  //check prefix
        let str = msg.content.substring(1); // remove prefix
        let {page, subpage} = getPageNumber(str); //get ttx page and subpage numbers

        if(str=='help' || str=='commands')
            msg.reply(help) // send help page
        else {
            imageUrl = `https://teletext.rtvslo.si/ttxdata/${page}_${subpage.padStart(4,'0')}.png?${dateFormat(new Date(), "dd.mm.yyyy%20HH:mm:00")}` 
            console.log(imageUrl)
            fetch(imageUrl , {method: 'HEAD'}).then((response)=>{  //check if page exists
                if(response.status != 200) {  // if NOT
                    try {
                        const ttx = new Discord.MessageEmbed()
                            .setTitle(`Stran ne obstaja!`)
                            .setImage(`https://api.oliwerix.com/900_0404.gif`)
                            
                        msg.reply('Stran ne obstaja!')
                        msg.reply(ttx).then(msg =>{
                            setTimeout(()=>msg.delete().catch(()=>{}),10000)
                        })
                    } catch (error) {
                        console.log(error);
                    }
                } else { // if exists
                    let links;  
                    fetch(`https://teletext.rtvslo.si/${page}/${subpage}`) // fetch the page html
                        .then(res => res.text().then(body=>{
                            links = extractPageNumbers(body); // the ttx links for buttons
                            subpages = countSubpages(body);   // string with the number of subpages
                            const ttx = new Discord.MessageEmbed()
                                .setTitle(`Z veseljem podajam stran ${page}-${subpage} SLO1 teletexta!`)
                                .setDescription(subpages)
                                .setImage(imageUrl)
                                .setFooter(links)
                            try {
                                if(!(msg.channel instanceof Discord.DMChannel))
                                    msg.delete(); // we can't delete from DMs, so here we check
                                msg.reply(ttx).then(msg => {
                                    messageClean(msg)    
                                })
                            }
                            catch (error) {
                                console.log(error);
                            }
                        }))
                }
            })

        }
    }
})

client.on('ready', async ()=> {
    await Channels.sync();
    console.log('Bot is ready!');
})


/**
 * Extracts the page and subpage number from user input
 * @param {String} str User input w/o prefix
 * @returns {String, String} The page and subpage number
 */
function getPageNumber(str) {
    //TODO make this elegant
    let subpage;
    let page = '100';

    if(str.length == 3)
        page = str;
    if(str.includes('-')){
        page = str.split('-')[0]
        subpage = str.split('-')[1]
    } 
    if (str.includes('.')){
        page = str.split('.')[0]
        subpage = str.split('.')[1]

    }

    if(subpage === undefined) {
        subpage = '1'
    }
    return {
        page,
        subpage
    }
}

/**
 * Finds subpages of given page
 * @param {String} page The fetched html of the website
 * @returns {String} String for usage in description in the embedded message
 */
function countSubpages(page) {
    var root = HTMLParser.parse(page, {blockTextElements: {
        script: false,
        style: false,
    }});
    items = root.querySelectorAll('.podstranLink')
    if(items.length > 1) {
        return `Podstrani: ${items.length}`
    } else {
        return ""
    }
}

/**
 * Find the links for the red, green, yellow and blue button
 * @param {String} page The fetched html of the website
 * @returns {String} A string showing the page numbers
 */
function extractPageNumbers(page) {
    var root = HTMLParser.parse(page, {blockTextElements: {
        script: false,
        style: false,
    }});
    root = root.querySelectorAll('area');
    let links = [];
    root.forEach(e=> {
        href = e.attributes.href.split('/')[0];
        let c = e.attributes.coords.split(',')
        let x = (parseInt(c[0])+parseInt(c[2]))/2
        if (c[1] == 322){
            links.push([href])
        }
    })
    if(links.length > 0){
        let out = ""
        links.forEach(l=>out+=l+"                             ")
        out = out.trim()
        out = "|               "+out+""
        return out
    } 
    return ""   
}

/**
 * Removes the previous messages if any
 * @param {Discord.Message} msg 
 */
async function messageClean(msg) {
    // first we check if the channel exists in database
    let channel = await Channels.findOne({where: {channel_id: msg.channel.id,},});
    if (channel){
        // if does, we update the field with the new message id
        await Channels.update({message_id: msg.id}, { where: { channel_id: channel.channel_id}})
        msg.channel.messages.fetch(channel.message_id).then( old_msg => {
            old_msg.delete().catch(error=>console.error('There may be permission issues!'))
        }
        ).catch(e=>{}) // the message may be deleted, so we just skip over ANY errors
                       // This needs to be fixed

    } else { // if there is no record of speaking on the current channel
        //      we create a new record
        await Channels.create({
            channel_id: msg.channel.id,
            message_id: msg.id,
        });
    }
}


/**
 * Table for storing the prevoius messages, used for deletion of old messages once new have been requested
 */
let Channels = sequelize.define('channels', {
    channel_id: { 
        type: Sequelize.STRING,
        unique: true,
    },
    message_id: {
        type: Sequelize.STRING,
        unique: true,
    }
})

