const Discord = require('discord.js');
require('dotenv').config();
const fetch = require('node-fetch');
const HTMLParser = require('node-html-parser');

const Sequelize = require('sequelize');
const sequelize = new Sequelize('database','user','hackmebaby',{
    host: 'localhost',
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false
});




const client = new Discord.Client();
client.login(process.env.BOT_TOKEN).then((token) => {
    client.user.setPresence({
     activity: { name: '%help' },
     status: 'online',
    });
   });
const PREFIX = '%';



const help = new Discord.MessageEmbed()
.setTitle(`Commands`)
.setDescription(`
 - %           Home
 - %xxx        Page xxx
 - %xxx-x      Page xxx, subpage x
 - %help       This help
`)
.setFooter('@Oliwerix')



client.on('message', (msg)=>{
    if (msg.content.startsWith(PREFIX)){
        let str = msg.content.substring(1);
        

        if(str=='help' || str=='commands')
            msg.reply(help)
        else {
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

            url = `https://teletext.rtvslo.si/ttxdata/${page}_${subpage.padStart(4,'0')}.png`
            fetch(url , {method: 'HEAD'}).then((response)=>{
                if(response.status != 200) {
                    try {
                        msg.reply(`Kera budala lmao, stran ${page}.${subpage} ne obstaja!`);
                    } catch (error) {
                        console.log(error);
                    }
                } else {
                    let links;
                    fetch(`https://teletext.rtvslo.si/${page}/${subpage}`)
                        .then(res => res.text().then(body=>{
                            
                            links = extractPageNumbers(body);
                            subpages = countSubpages(body);
                            const ttx = new Discord.MessageEmbed()
                                .setTitle(`Z veseljem podajam stran ${page}-${subpage} SLO1 teletexta!`)
                                .setDescription(subpages)
                                .setImage(url)
                                .setFooter(links)
                            try {
                                if(!(msg.channel instanceof Discord.DMChannel))
                                    msg.delete();
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
        out = "|               "+out+"               |"
        return out
    } 
    else
    return ""
    
}
async function messageClean(msg) {
    let channel = await Channels.findOne({where: {channel_id: msg.channel.id,},});
    if (channel){
        await Channels.update({message_id: msg.id}, { where: { channel_id: channel.channel_id}})
        msg.channel.messages.fetch(channel.message_id).then( message => {
            message.delete().catch(error=>console.error('There may be permission issues!'))
        }
        ).catch(e=>{})

    } else {
        await Channels.create({
            channel_id: msg.channel.id,
            message_id: msg.id,
        });
    }
}



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

