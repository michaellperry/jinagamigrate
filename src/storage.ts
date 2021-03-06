export type FactReference = {
    type: string;
    hash: string;
};

export type FactPath = FactReference[];

export type PredecessorCollection = {
    [role: string]: FactReference[] | FactReference
};

export type FactRecord = {
    type: string;
    hash: string;
    predecessors: PredecessorCollection,
    fields: {};
};

export interface Storage {
    save(facts: FactRecord[]): Promise<FactRecord[]>;
}

export function factReferenceEquals(a: FactReference) {
    return (r: FactReference) => r.hash === a.hash && r.type === a.type;
}