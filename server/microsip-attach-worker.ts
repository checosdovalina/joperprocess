/**
 * Isolated Firebird attach process. The parent kills this process on timeout
 * so a hung handshake cannot block other companies in the main Nexxo process.
 */
import Firebird from 'node-firebird';

let db: {
  query: (sql: string, params: unknown[], cb: (err: Error | null, result: unknown[]) => void) => void;
  detach: (cb?: (err: Error | null) => void) => void;
} | null = null;

function send(msg: unknown) {
  if (process.send) process.send(msg);
}

process.on('message', (msg: { op: string; options?: Firebird.Options; id?: number; sql?: string; params?: unknown[] }) => {
  if (msg.op === 'attach' && msg.options) {
    Firebird.attach(msg.options, (err, conn) => {
      if (err) {
        send({ event: 'attach', error: err.message });
        process.exit(1);
        return;
      }
      db = conn;
      send({ event: 'attach', ok: true });
    });
    return;
  }

  if (msg.op === 'query' && db) {
    db.query(msg.sql || '', msg.params || [], (err, result) => {
      send({ event: 'query', id: msg.id, error: err?.message ?? null, result: result || [] });
    });
    return;
  }

  if (msg.op === 'detach') {
    if (!db) {
      process.exit(0);
      return;
    }
    db.detach((err) => {
      send({ event: 'detach', error: err?.message ?? null });
      process.exit(0);
    });
  }
});
