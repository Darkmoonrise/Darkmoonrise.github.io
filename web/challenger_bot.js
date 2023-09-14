const fs = require('fs');

// Function to import data from JSON files
function importData() {
    const instances = JSON.parse(fs.readFileSync(__dirname + '/instances.json', 'utf8'));
    const challenges = JSON.parse(fs.readFileSync(__dirname + '/challenges.json', 'utf8'));
    const roles = JSON.parse(fs.readFileSync(__dirname + '/roles.json', 'utf8'));
    const secret = JSON.parse(fs.readFileSync(__dirname + '/secret_challenges.json', 'utf8'));

    return { instances, challenges, roles, secret };
}

// Function to shuffle an array in-place
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Function to get instances
function getInstances(instances, partySize, maxLevel, withHard) {
    let data = instances;
    data = data.filter(d => d.partySize === partySize);
    data = data.filter(d => d.level <= maxLevel);
    if (!withHard) {
        data = data.filter(d => d.difficulty === "normal");
    }

    data = data.map(d => `${d.name} (${d.type} lvl ${d.level})`);
    shuffleArray(data);

    return data[0];
}

// Function to get challenges
function getChallenges(challenges, number) {
    let data = challenges;
    let classOnly = false;
    let tankOnly = false;
    let healOnly = false;
    let dpsOnly = false;
    let continueFlag = true;
    let tryCounter = 0;

    while (continueFlag) {
        shuffleArray(data);
        const selected = data.slice(0, number);

        const selectedIds = selected.map(s => s.id);
        const incompatibilityIds = [...new Set(selected.flatMap(s => s.incompatibility))];

        continueFlag = false;

        if (number === 1 && incompatibilityIds.includes(-1)) {
            continueFlag = true;
        }

        for (const id of selectedIds) {
            if (incompatibilityIds.includes(id)) {
                continueFlag = true;
                break;
            }
        }

        tryCounter++;
        if (continueFlag === true && tryCounter > 10) {
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

// Function to get roles
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

// Function to distribute roles
function distributeRoles(roles, names) {
    shuffleArray(names);

    const data = [];
    for (let i = 0; i < roles.length; i++) {
        data.push(`${names[i]} shall play ${roles[i]}`);
    }

    return data;
}

// Function to get a secret challenge
function getSecretChallenge(secret, partySize, playerNames) {
    let retStr = "";
    if (Math.random() < 0.05) {
        shuffleArray(secret);
        const d = secret[0];
        retStr = `${d.name} (${d.description})`;
        if (d.name === "Santa") {
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
    }

    return retStr;
}

// Function to generate a challenge
function generateChallenge(challengeNumberOf, partySize4, partySize8, playerNames = [], withHard = false) {
    const { instances, challenges, roles, secret } = importData();
    const maxLevel = 90;
    const partySize = partySize4 ? 4 : (partySize8 ? 8 : -1);
    playerNames = playerNames.slice(0, partySize);

    if (!(partySize === 4 || partySize === 8)) return `Number of players given (${partySize}) not valid. Should be 4 or 8.`;

    retStr = "```Welcome to XIV challenge run generator!\n";

    const inst = getInstances(instances, partySize, maxLevel, withHard);
    retStr += `Instance     : ${inst}\n`;

    const [chal, co, to, ho, dpso] = getChallenges(challenges, challengeNumberOf);
    if (chal === null) return `Failed to find ${challengeNumberOf} challenges compatible with each other after 10 tries. Please try to lower the number of challenges.`;
    retStr += `Constrain(s) : ${chal[0]}\n`;
    for (let i = 1; i < chal.length; i++) {
        retStr += `               ${chal[i]}\n`;
    }

    const sText = getSecretChallenge(secret, partySize, playerNames);
    if (sText) {
        retStr += `Secret bonus : ${sText}\n`;
    }

    if (playerNames.length !== 0) {
        let tn, hn, dn;
        if (to) {
            tn = partySize;
            hn = 0;
            dn = 0;
        } else if (ho) {
            tn = 0;
            hn = partySize;
            dn = 0;
        } else if (dpso) {
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

        const role = getRoles(roles, tn, hn, dn, co);
        const distributedRoles = distributeRoles(role, playerNames);

        retStr += `Composition  : ${distributedRoles[0]}\n`;
        for (let i = 1; i < distributedRoles.length; i++) {
            retStr += `               ${distributedRoles[i]}\n`;
        }
    }

    retStr += "```";

    return retStr;
}

// Example usage
const result = generateChallenge(3, true, false, ["Player1", "Player2", "Player3", "Player4", "Player5", "Player6", "Player7", "Player8"]);
console.log(result);
