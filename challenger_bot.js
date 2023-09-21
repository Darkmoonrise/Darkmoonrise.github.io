async function getJson(path) {
    a = fetch(path).then((response) => {return response.json();});
    b = await a.then(jsonData => {return jsonData});
    return b;
}


async function importData() {
    const instances = await getJson('https://darkmoonrise.github.io/instances.json');
    const challenges = await getJson('https://darkmoonrise.github.io/challenges.json');
    const roles = await getJson('https://darkmoonrise.github.io/roles.json');
    const secret = await getJson('https://darkmoonrise.github.io/secret_challenges.json');
    return [instances, challenges, roles, secret];
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function getInstances(data, partySize, maxLevel, withHard) {
    data = data.filter(d => d.partySize === partySize);
    data = data.filter(d => d.level <= maxLevel);
    if (!withHard) {
        data = data.filter(d => d.difficulty === "normal");
    }
    data = data.map(d => `${d.name} (${d.type} lvl ${d.level})`);
    shuffleArray(data);
    return data[0];
}

function getChallenges(challenges, number, withHardChallenge) {
    let data = challenges;
    let classOnly = false;
    let tankOnly = false;
    let healOnly = false;
    let dpsOnly = false;
    let continueFlag = true;
    let tryCounter = 0;
    let selected;

    if(!withHardChallenge) {
        data = data.filter(d => d.difficulty === 0);
    }

    while (continueFlag) {
        shuffleArray(data);
        selected = data.slice(0, number);

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

    shuffleArray(t);
    shuffleArray(h);
    shuffleArray(d);

    data = t.slice(0, tank).concat(h.slice(0, healer), d.slice(0, dps));

    return data;
}

function distributeRoles(roles, names) {
    shuffleArray(names);

    const data = [];
    for (let i = 0; i < roles.length; i++) {
        data.push(`${names[i]} shall play ${roles[i]}`);
    }

    return data;
}

function getSecretChallenge(secret, partySize, playerNames) {
    let retStr = "";
    if (Math.floor(Math.random() * 20) + 1 === 1) {
        shuffleArray(secret);
        const d = secret[0];
        retStr = `${d.name} (${d.description})`;
        if (playerNames.length === 0) {
            if (partySize === 4) {
                retStr += "(order: T->H->D1->D2->T)";
            } else {
                retStr += "(order: T1->D1->H1->D2->T2->D3->H2->D4->T1)";
            }
        } else {
            shuffleArray(playerNames);
            retStr += "(order: ";
            for (const p of playerNames) {
                retStr += `${p}->`;
            }
            retStr += `${playerNames[0]})`;
        }
    }

    return retStr;
}

async function generateChallenge(challengeNumberOf, partySize4, partySize8, playerNames, withHard, withHardChallenge) {
    const [i, c, r, s] = await importData();
    const maxLevel = 90;
    let partySize;

    if (partySize4) {
        partySize = 4;
    } else if (partySize8) {
        partySize = 8;
    } else {
        partySize = -1;
    }

    playerNames = playerNames.slice(0, partySize);

    if (!(partySize === 4 || partySize === 8)) {
        return `Number of players given (${partySize}) not valid. Should be 4 or 8.`;
    }

    strNormal = `Welcome to XIV challenge run generator!\r\n`;
    strFf = `Your challenge will be. `

    const inst = getInstances(i, partySize, maxLevel, withHard);
    strNormal += `Instance     : ${inst}\r\n`;
    strFf = `INSTANCE : ${inst}`;

    const [chal, classOnly, tankOnly, healOnly, dpsOnly] = getChallenges(c, challengeNumberOf, withHardChallenge);
    if (!chal) {
        return `Failed to find ${challengeNumberOf} challenges compatible with each other after 10 tries. Please try to lower the number of challenges.`;
    }
    strNormal += `Constrain(s) : ${chal[0]}\r\n`;
    strFf += `         ///        CONSTRAINS : ${chal[0]}`;
    for (let i = 1; i < chal.length; i++) {
        strNormal += `               ${chal[i]}\r\n`;
        strFf += `   |   ${chal[i]}`;
    }

    const sText = getSecretChallenge(s, partySize, playerNames);
    if (sText) {
        strNormal += `Secret bonus : ${sText}\r\n`;
        strFf += `         ///        SECRET : ${sText}`;
    }

    let printRole = false;
    for (let i = 0; i < playerNames.length; i++) {
        if (playerNames[i].length !== 0)
        {
            printRole = true;
        }
    }
    if (printRole) {
        for (let i = 0; i < playerNames.length; i++) {
            if (playerNames[i].length == 0)
            {
                playerNames[i] = `player${i+1}`;
            }
        }

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

        strNormal += `Composition  : ${distributedRoles[0]}\r\n`;
        strFf += `         ///        COMPO  : ${distributedRoles[0]}`;
        for (let i = 1; i < distributedRoles.length; i++) {
            strNormal += `               ${distributedRoles[i]}\r\n`;
            strFf += `   |   ${distributedRoles[i]}`;
        }
    }

    strDiscord = "```" + strNormal + "```";

    return [strNormal, strDiscord, strFf];
}
