# example de fichier pour pong un message
from Backend.message_send import message_send


async def pong_message(message):
    await message_send(message, 'pong ' + message.content.split('ping')[1])
