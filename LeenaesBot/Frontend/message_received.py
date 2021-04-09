from Frontend.pong import pong_message
from Frontend.challenge import challenge
from Backend.message_send import message_send


# Cette fonction est appelée quand tu reçois un message
# dans message tu peux avoir son contenu comme ceci
# message.content
# a éditer pour chaque nouvelle command
async def message_received(message):
    # example qui ping pong le message si il commence par pong
    if message.content.startswith('!lb'):
        command = message.content.split(' ')[1]
        if command == 'ping':
            await pong_message(message)
        elif command == 'challenge':
            await challenge(message)
        # ici tu ajoutes les nouvelles commandes comme pour challenge par exemple
        else:
            await message_send(message, 'Déso, j\'ai pas compris...')
