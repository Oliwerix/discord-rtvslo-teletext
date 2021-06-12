
const Discord = require('discord.js');


const help = new Discord.MessageEmbed()
.setTitle(`Commands`)
.setDescription(`
 - %           Home
 - %xxx        Page xxx
 - %xxx-x      Page xxx, subpage x
 - %help       This help
`)
.setFooter('@Oliwerix')


module.exports = {
    help: help,
}
