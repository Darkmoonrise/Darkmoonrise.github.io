import json
from random import *
import random
import os

def import_data():
    with open(os.path.dirname(__file__) + '\\instances.json', 'r') as f:
        instances = json.load(f)
    
    with open(os.path.dirname(__file__) + '\\challenges.json', 'r') as f:
        challenges = json.load(f)

    with open(os.path.dirname(__file__) + '\\roles.json', 'r') as f:
        roles = json.load(f)

    with open(os.path.dirname(__file__) + '\\secret_challenges.json', 'r') as f:
        secret = json.load(f)

    return instances, challenges, roles, secret

def get_instances(instances, partySize, max_level, with_hard):
    data = instances
    data = [d for d in data if d["partySize"] == partySize]
    data = [d for d in data if d["level"] <= max_level]
    if not with_hard:
        data = [ d for d in data if d["difficulty"] == "normal"]
    
    data = [d["name"] + " (" + d["type"] + " lvl " + str(d["level"]) + ")" for d in data]
    shuffle(data)

    return data[0]

def get_challenges(challenges, number):
    data = challenges
    class_only = False
    tank_only = False
    heal_only = False
    dps_only = False
    continue_flag = True
    try_counter = 0

    while continue_flag:
        shuffle(data)
        selected = data[0:number]

        selected_id = [s["id"] for s in selected]
        incompatibilty_id = list(set([item for sublist in [s["incompatibilty"] for s in selected] for item in sublist]))
        
        continue_flag = False
        for id in selected_id:
            if id in incompatibilty_id:
                continue_flag = True
                break

        try_counter += 1
        if continue_flag == True and try_counter > 10:
            return None, None, None, None, None

    for d in selected:
        if d["name"] == "Class Only":
            class_only = True
        if d["name"] == "Tank Master Race":
            tank_only = True
        if d["name"] == "Heal Master Race":
            heal_only = True
        if d["name"] == "DPS Master Race":
            dps_only = True
            

    nice = [d["name"] + " (" + d["description"] + ")" for d in selected]

    return nice, class_only, tank_only, heal_only, dps_only

def get_roles(roles, tank, healer, dps, class_only):
    data = roles
    if class_only:
        data = [d for d in data if d["type"] == "class"]
    else:
        data = [d for d in data if d["type"] == "job"]
    
    t = [d["name"] + " (tank)" for d in data if d["role"] == "tank"]
    h = [d["name"] + " (heal)" for d in data if d["role"] == "heal"]
    d = [d["name"] + " (dps)" for d in data if d["role"] == "dps"]

    while(len(t) < tank + 1): t += t
    while(len(h) < healer + 1): h += h
    while(len(d) < dps + 1): d += d

    shuffle(t)
    shuffle(h)
    shuffle(d)

    data = t[0:tank] + h[0:healer] + d[0:dps]

    return data

def distribute_roles(roles, names):
    shuffle(names)

    data = []
    for i in range(len(roles)):
        data.append(names[i] + " shall play " + roles[i])

    return data
    
def get_secretChallenge(secret, partySize, player_names):
    ret_str = ""
    if 1 == random.randint(1, 20):
        shuffle(secret)
        d = secret[0]
        ret_str = d["name"] + " (" + d["description"] + ")"
        if d["name"] == "Santa":
            if 0 == len(player_names):
                if partySize == 4:
                    ret_str += "(order: T->H->D1->D2->T)"
                else:
                    ret_str += "(order: T1->H1->D1->D2->T2->H2->D3->D4->T1)"
            else:
                shuffle(player_names)
                ret_str += "(order: "
                for p in player_names:
                    ret_str += p + "->"
                ret_str += player_names[0] + ")"

    return ret_str

def generate_challenge(challenge_numberOf, partySize, player_names = [], max_level = 90, with_hard = False):
    i, c, r, s = import_data()

    if not(partySize == 4 or partySize == 8): return "Number of players given (" + str(partySize) + ") not valid. Should be 4, 8 or 24."
    if len(player_names) != 0 and len(player_names) != partySize: return "Number of player names (" + str(len(player_names)) + ") does not match the party size (" + str(partySize) + ")."
    if challenge_numberOf <= 0 or challenge_numberOf > len(c): return "Number of challenges (" + str(challenge_numberOf) + ") not valid. Should be between 1 and " + str(len(c)) + "."
    
    ret_str = "```Welcome to the FFXIV challenge run generator!\n"
    
    inst = get_instances(i, partySize, max_level, with_hard)
    ret_str += "Instance     : " + inst + "\n"

    chal, co, to, ho, do = get_challenges(c, challenge_numberOf)
    if chal == None: return "Failed to find a " + str(challenge_numberOf) + " challenges compatible with each other after 10 tries. Please try to lower the number of challenges."
    ret_str += "Constrain(s) : " + chal[0]  + "\n"
    for c in chal[1:len(chal)]:
        ret_str += "               " + c + "\n"

    s_text = get_secretChallenge(s, partySize, player_names)
    if s_text:
        ret_str += "Secret bonus : " + s_text  + "\n"

    if len(player_names) != 0:
        if to:
            tn = partySize
            hn = 0
            dn = 0
        elif ho:
            tn = 0
            hn = partySize
            dn = 0
        elif do:
            tn = 0
            hn = 0
            dn = partySize
        elif partySize == 4:
            tn = 1
            hn = 1
            dn = 2
        elif partySize == 8:
            tn = 2
            hn = 2
            dn = 4
  
        role = get_roles(r, tn, hn, dn, co)
        role = distribute_roles(role, player_names)

        ret_str += "Composition  : " + role[0] + "\n"
        for r in role[1:len(role)]:
            ret_str += "               " + r + "\n"

    ret_str += "```"

    return ret_str


print(generate_challenge(2, 4, ["Leen", "Dark", "Usas", "Riri"]))