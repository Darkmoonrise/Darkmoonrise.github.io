# bot.py
import os
from dotenv import load_dotenv
from discord.ext.commands import Bot
from Frontend import message_received


load_dotenv()
TOKEN = os.getenv('DISCORD_TOKEN')
client = Bot(command_prefix="!")


@client.event
async def on_ready():
    print(f'{client.user} has connected to Discord!')


@client.event
async def on_message(message):
    await message_received.message_received(message)


client.run(TOKEN)
