import { FactRecord, Storage } from './storage';
import { flatten } from './fn';
import { ConnectionFactory } from './connection';
import { makeEdgeRecords } from './edge-record';

export class PostgresStore implements Storage {
    private connectionFactory: ConnectionFactory;

    constructor (postgresUri: string) {
        this.connectionFactory = new ConnectionFactory(postgresUri);
    }
    
    async save(facts: FactRecord[]): Promise<FactRecord[]> {
        if (facts.length > 0) {
            const edgeRecords = flatten(facts, makeEdgeRecords);
            const factValues = facts.map((f, i) => '($' + (i*4 + 1) + ', $' + (i*4 + 2) + ', $' + (i*4 + 3) + ', $' + (i*4 + 4) + ')');
            const factParameters = flatten(facts, (f) => [f.hash, f.type, JSON.stringify(f.fields), JSON.stringify(f.predecessors)]);
            await this.connectionFactory.withTransaction(async (connection) => {
                if (edgeRecords.length > 0) {
                    const edgeValues = edgeRecords.map((e, i) => '($' + (i*5 + 1) + ', $' + (i*5 + 2) + ', $' + (i*5 + 3) + ', $' + (i*5 + 4) + ', $' + (i*5 + 5) + ')');
                    const edgeParameters = flatten(edgeRecords, (e) => [e.predecessor_hash, e.predecessor_type, e.successor_hash, e.successor_type, e.role]);
                    const sqlEdge = 'INSERT INTO public.edge' +
                        ' (predecessor_hash, predecessor_type, successor_hash, successor_type, role)' +
                        ' (SELECT predecessor_hash, predecessor_type, successor_hash, successor_type, role' +
                        '  FROM (VALUES ' + edgeValues.join(', ') + ') AS v(predecessor_hash, predecessor_type, successor_hash, successor_type, role)' +
                        '  WHERE NOT EXISTS (SELECT 1 FROM public.edge' +
                        '   WHERE edge.predecessor_hash = v.predecessor_hash AND edge.predecessor_type = v.predecessor_type AND edge.successor_hash = v.successor_hash AND edge.successor_type = v.successor_type AND edge.role = v.role))';
                    await connection.query(sqlEdge, edgeParameters);
                }

                const sqlFact = 'INSERT INTO public.fact' +
                    ' (hash, type, fields, predecessors)' +
                    ' (SELECT hash, type, to_jsonb(fields), to_jsonb(predecessors)' +
                    '  FROM (VALUES ' + factValues.join(', ') + ') AS v(hash, type, fields, predecessors)' +
                    '  WHERE NOT EXISTS (SELECT 1 FROM public.fact' +
                    '   WHERE fact.hash = v.hash AND fact.type = v.type))';
                await connection.query(sqlFact, factParameters);
            });
        }
        return facts;
    }
}