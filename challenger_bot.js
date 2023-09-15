function getJson(path) {
    let rawdata;

    fetch(path)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
                return response.json(); // Parse the response as JSON
            })
        .then(data => {
            rawdata = data;
        })
        .catch(error => {
            console.error('Fetch error:', error);
        });
    
    return rawdata;
}


function importData() {
    const instances = getJson('instances.json');
    const challenges = getJson('challenges.json');
    const roles = getJson('roles.json');
    const secret = getJson('secret_challenges.json');
    return [instances, challenges, roles, secret];
}

function getInstances(data, partySize, maxLevel, withHard) {
    data = data.filter(d => d.partySize === partySize);
    data = data.filter(d => d.level <= maxLevel);
    if (!withHard) {
        data = data.filter(d => d.difficulty === "normal");
    }
    data = data.map(d => `${d.name} (${d.type} lvl ${d.level})`);
    shuffle(data);
    return data[0];
}

function getChallenges(challenges, number) {
    let data = challenges;
    let classOnly = false;
    let tankOnly = false;
    let healOnly = false;
    let dpsOnly = false;
    let continueFlag = true;
    let tryCounter = 0;

    while (continueFlag) {
        shuffle(data);
        const selected = data.slice(0, number);

        const selectedId = selected.map(s => s.id);
        const incompatibilityId = [...new Set(selected.flatMap(s => s.incompatibility))];

        continueFlag = false;

        if (number === 1 && incompatibilityId.includes(-1)) {
            continueFlag = true;
        }

        for (const id of selectedId) {
            if (incompatibilityId.includes(id)) {
                continueFlag = true;
                break;
            }
        }

        tryCounter += 1;
        if (continueFlag && tryCounter > 10) {
            return [null, null, null, null, null];
        }
    }

    for (const d of selected) {
        if (d.name === "Class Only") {
            classOnly = true;
        }
        if (d.name === "Tank Master Race") {
            tankOnly = true;
        }
        if (d.name === "Heal Master Race") {
            healOnly = true;
        }
        if (d.name === "DPS Master Race") {
            dpsOnly = true;
        }
    }

    const nice = selected.map(d => `${d.name} (${d.description})`);

    return [nice, classOnly, tankOnly, healOnly, dpsOnly];
}

function getRoles(roles, tank, healer, dps, classOnly) {
    let data = roles;
    if (classOnly) {
        data = data.filter(d => d.type === "class");
    } else {
        data = data.filter(d => d.type === "job");
    }

    const t = data.filter(d => d.role === "tank").map(d => `${d.name} (tank)`);
    const h = data.filter(d => d.role === "heal").map(d => `${d.name} (heal)`);
    const d = data.filter(d => d.role === "dps").map(d => `${d.name} (dps)`);

    while (t.length < tank + 1) t.push(...t);
    while (h.length < healer + 1) h.push(...h);
    while (d.length < dps + 1) d.push(...d);

    shuffle(t);
    shuffle(h);
    shuffle(d);

    data = t.slice(0, tank).concat(h.slice(0, healer), d.slice(0, dps));

    return data;
}

function distributeRoles(roles, names) {
    shuffle(names);

    const data = [];
    for (let i = 0; i < roles.length; i++) {
        data.push(`${names[i]} shall play ${roles[i]}`);
    }

    return data;
}

function getSecretChallenge(secret, partySize, playerNames) {
    let retStr = "";
    if (Math.floor(Math.random() * 20) + 1 === 1) {
        shuffle(secret);
        const d = secret[0];
        retStr = `${d.name} (${d.description})`;
        if (playerNames.length === 0) {
            if (partySize === 4) {
                retStr += "(order: T->H->D1->D2->T)";
            } else {
                retStr += "(order: T1->D1->H1->D2->T2->D3->H2->D4->T1)";
            }
        } else {
            shuffle(playerNames);
            retStr += "(order: ";
            for (const p of playerNames) {
                retStr += `${p}->`;
            }
            retStr += `${playerNames[0]})`;
        }
    }

    return retStr;
}

function generateChallenge(challengeNumberOf, partySize4, partySize8, playerNames, withHard) {
    const [i, c, r, s] = importData();
    const maxLevel = 90;
    let partySize;

    if (partySize4) {
        partySize = 4;
    } else if (partySize8) {
        partySize = 8;
    } else {
        partySize = -1;
    }

    playerNames = playerNames[0].slice(0, partySize);

    if (!(partySize === 4 || partySize === 8)) {
        return `Number of players given (${partySize}) not valid. Should be 4 or 8.`;
    }

    const retStr = "```Welcome to XIV challenge run generator!\n";

    const inst = getInstances(i, partySize, maxLevel, withHard);
    retStr += `Instance     : ${inst}\n`;

    const [chal, classOnly, tankOnly, healOnly, dpsOnly] = getChallenges(c, challengeNumberOf);
    if (!chal) {
        return `Failed to find ${challengeNumberOf} challenges compatible with each other after 10 tries. Please try to lower the number of challenges.`;
    }
    retStr += `Constrain(s) : ${chal[0]}\n`;
    for (let i = 1; i < chal.length; i++) {
        retStr += `               ${chal[i]}\n`;
    }

    const sText = getSecretChallenge(s, partySize, playerNames);
    if (sText) {
        retStr += `Secret bonus : ${sText}\n`;
    }

    if (playerNames.length !== 0) {
        let tn, hn, dn;
        if (tankOnly) {
            tn = partySize;
            hn = 0;
            dn = 0;
        } else if (healOnly) {
            tn = 0;
            hn = partySize;
            dn = 0;
        } else if (dpsOnly) {
            tn = 0;
            hn = 0;
            dn = partySize;
        } else if (partySize === 4) {
            tn = 1;
            hn = 1;
            dn = 2;
        } else if (partySize === 8) {
            tn = 2;
            hn = 2;
            dn = 4;
        }

        const role = getRoles(r, tn, hn, dn, classOnly);
        const distributedRoles = distributeRoles(role, playerNames);

        retStr += `Composition  : ${distributedRoles[0]}\n`;
        for (let i = 1; i < distributedRoles.length; i++) {
            retStr += `               ${distributedRoles[i]}\n`;
        }
    }

    retStr += "```";

    return retStr;
}
