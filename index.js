const { Client } = require('discord.js');
const { TOKEN, PREFIX } = require('./config');
const ytdl = require("ytdl-core");

const client = new Client({ disableEveryone: true });

const queue = new Map();

client.on('warn', console.warn);

client.on('error', console.error);

client.on("ready", () => {
    console.log('Bot is ready to be supportive!');
    client.user.setActivity('u!play (youtube url) to play some sick tunes!', { type: 'PLAYING' });
});

client.on('disconnect', () => console.log('Turning my ass off'));

client.on('reconnecting', () => console.log('I am reconnectiong now!'));


client.on('message', async msg => {
    if (msg.author.bot) return undefined;
    if (!msg.content.startsWith(PREFIX)) return undefined; 
    const args = msg.content.split(' ');
    const serverQueue = queue.get(msg.guild.id);

    if (msg.content.startsWith(`${PREFIX}play`)) {
        const voiceChannel = msg.member.voiceChannel;
        if (!voiceChannel) return msg.channel.send('I\'m sorry but you need to be in a voice channel to play some tunes!');
        const permissions = voiceChannel.permissionsFor(msg.client.user);
        if(!permissions.has('CONNECT')) {
            return msg.channel.send('I dont have permission to enter your voice channel. Make sure to hand me the proper permissions!');
        }
        if(!permissions.has('SPEAK')) {
            return msg.channel.send('I dont have permission to speak in this voice channel. Make sure to hand me the proper permissions!');
        }
        const songInfo = await ytdl.getInfo(args[1]);
        const song = {
            title: songInfo.title,
            url: songInfo.video_url
        };
        if (!serverQueue) {
            const queueConstruct = {
                textChannel: msg.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: 5,
                playing: true
            };
            queue.set(msg.guild.id, queueConstruct);

            queueConstruct.songs.push(song);

            try {
                var connection = await voiceChannel.join();
                queueConstruct.connection = connection;
                play(msg.guild, queueConstruct.songs[0]);
                } catch (error) {
                    console.error(`I could not join the voice channel: ${error}`);
                    queue.delete(msg.guild.id);
                    return msg.channel.send(`I could not join the voice  channel: ${error}`);
                }
            } else {
                serverQueue.songs.push(song);
                return msg.channel.send(`**${song.title}** has been added to the queue!`);
            }
        return undefined;
    } else if (msg.content.startsWith(`${PREFIX}stop`)) {
        if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel!');
        msg.member.voiceChannel.leave();
        return undefined;
    }
});

function play(guild, song) {
    const serverQueue = queue.get(guild.id);

    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }
    console.log(serverQueue.songs);

    const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
        .on('end', () => {
            console.log('Song ended!');
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on('error', error => console.error(error));
    dispatcher.setVolumeLogarithmic(5 / 5);
}

client.login(TOKEN);
