import { hash } from 'tweetnacl';
import { decodeUTF8, encodeBase64 } from 'tweetnacl-util';

import { FactReference, PredecessorCollection } from './storage';
import { HashMap } from './hydrate';

export function computeHash(fields: {}, predecessors: PredecessorCollection) {
    return computeObjectHash({
        fields: fields,
        predecessors: canonicalPredecessors(predecessors)
    });
}

function canonicalPredecessors(predecessors: PredecessorCollection) {
    let result: PredecessorCollection = {};
    for(const role in predecessors) {
        const referenceMessages = predecessors[role];
        if (Array.isArray(referenceMessages)) {
            result[role] = sortedPredecessors(referenceMessages);
        }
        else {
            result[role] = referenceMessages;
        }
    }
    return result;
}

function sortedPredecessors(predecessors: FactReference[]) {
    return predecessors.slice().sort((a,b) => {
        if (a.hash < b.hash)
            return -1;
        else if (a.hash > b.hash)
            return 1;
        if (a.type < b.type)
            return -1;
        else if (a.type > b.type)
            return 1;
        else
            return 0;
    });
}

function computeObjectHash(obj: {}) {
    if (!obj)
        return '';

    const str = canonicalize(obj);
    const bytes = decodeUTF8(str);
    const result = hash(bytes);
    const b64 = encodeBase64(result);
    return b64;
}

type Pair = { key: string, value: any };

function canonicalize(obj: HashMap) {
    let pairs: Pair[] = [];
    for (const key in obj) {
        const value = obj[key];
        pairs.push({ key, value });
    }
    pairs.sort((a, b) => {
        if (a.key < b.key)
            return -1;
        else if (a.key > b.key)
            return 1;
        else
            return 0;
    });
    const members = pairs.reduce((text, pair) => {
        if (text.length > 0)
            text += ',';
        text += '"' + pair.key + '":' + serialize(pair.value);
        return text;
    }, '');
    return '{' + members + '}';
}

function serialize(value: any) {
    if (typeof(value) === 'object') {
        if (value instanceof Date) {
            return 'Date.parse("' + value.toISOString() + '")';
        }
        else if (Array.isArray(value)) {
            const values = value.reduce((text, element) => {
                if (text.length > 0)
                    text += ',';
                text += serialize(element);
                return text;
            }, '');
            return '[' + values + ']';
        }
        else {
            return canonicalize(value);
        }
    }
    else {
        return JSON.stringify(value);
    }
}