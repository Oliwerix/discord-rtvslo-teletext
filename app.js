const Discord = require('discord.js');
require('dotenv').config();
const fetch = require('node-fetch');
const HTMLParser = require('node-html-parser');

const client = new Discord.Client();
client.login(process.env.BOT_TOKEN)
const commandPrefixRegex = new RegExp('^\\?');

const help = new Discord.MessageEmbed()
.setTitle(`Commands`)
.setDescription(`
 - ?           Home
 - ?xxx        Page xxx
 - ?xxx-x      Page xxx, subpage x
 - ?help       This help
`)
.setFooter('@Oliwerix')



client.on('message', (msg)=>{
    if (commandPrefixRegex.test(msg.content)){
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
            if(subpage === undefined) {
                subpage = '1'
            }

            url = `https://teletext.rtvslo.si/ttxdata/${page}_${subpage.padStart(4,'0')}.png`
            fetch(url , {method: 'HEAD'}).then((response)=>{
                if(response.status != 200) {
                    try {
                        msg.reply(`Kera budala lmao, stran ${page} ne obstaja!`);
                    } catch (error) {
                        console.log(error);
                    }
                } else {
                    let links;
                    fetch(`https://teletext.rtvslo.si/${page}/${subpage}`)
                        .then(res => res.text().then(body=>{
                            links = extractPageNumbers(body);
                            subpages = countSubpages(body);
                            if(subpages > 1) {
                                subpages = `Podstrani: ${countSubpages(body)}`
                            } else {
                                subpages = ""
                            }
                            console.log(links)
                            const ttx = new Discord.MessageEmbed()
                                .setTitle(`Z veseljem podajam stran ${page}-${subpage} SLO1 teletexta!`)
                                .setDescription(subpages)
                                .setImage(url)
                                .setFooter(links)
                            msg.delete()
                            msg.reply(ttx).then(msg => {
                                setTimeout(()=>{
                                        try {msg.delete()}
                                        catch(error) { console.log(error)}
                                    }
                                    ,20000)
                                    
                            })
                        }))
                }
            })

        }
    }
})

client.on('ready', ()=>{
    console.log('Bot is ready!')
})
function countSubpages(page) {
    var root = HTMLParser.parse(page, {blockTextElements: {
        script: false,
        style: false,
    }});
    items = root.querySelectorAll('.podstranLink')
    return items.length
}


function extractPageNumbers(page) {
    var root = HTMLParser.parse(page, {blockTextElements: {
        script: false,
        style: false,
    }});
    root = root.querySelectorAll('area');
    let regex = /\d+,322,/g
    let links = [];
    root.forEach(e=> {
        href = e.attributes.href.split('/')[0];
        let c = e.attributes.coords.split(',')
        let x = (parseInt(c[0])+parseInt(c[2]))/2
        if (c[1] == 322){
            console.log(x)
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