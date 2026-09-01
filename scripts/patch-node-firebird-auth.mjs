import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const packageEntry = require.resolve('node-firebird');
const connectionPath = join(dirname(packageEntry), 'wire', 'connection.js');

const original = `                if (cnx._pendingAccept && pluginName === const_1.default.AUTH_PLUGIN_LEGACY) {
                    if (process.env.FIREBIRD_DEBUG) {
                        console.log('[fb-debug] auth: SRP+Legacy_Auth chained-auth (proto %d), sending Legacy_Auth credentials t=%dms', cnx._pendingAccept.protocolVersion, cnx._authStartTime ? Date.now() - cnx._authStartTime : -1);
                    }
                    var legacyAuthData = crypt.crypt(cnx.options.password, const_1.default.LEGACY_AUTH_SALT).substring(2);
                    cnx.sendOpContAuth(legacyAuthData, const_1.default.DEFAULT_ENCODING, pluginName);
                    return; // wait for op_accept
                }`;

const patched = `                // Some Firebird databases request a Legacy_Auth verification
                // after SRP has already completed and op_accept_data has been
                // dispatched. In that flow _pendingAccept is empty, but the
                // accepted SRP state remains available in cnx.accept.
                var chainedAccept = cnx._pendingAccept || cnx.accept;
                if (chainedAccept &&
                    pluginName === const_1.default.AUTH_PLUGIN_LEGACY &&
                    (cnx._pendingAccept || const_1.default.AUTH_PLUGIN_SRP_LIST.indexOf(chainedAccept.pluginName) !== -1)) {
                    if (process.env.FIREBIRD_DEBUG) {
                        console.log('[fb-debug] auth: SRP+Legacy_Auth chained-auth (proto %d), sending Legacy_Auth credentials t=%dms', chainedAccept.protocolVersion, cnx._authStartTime ? Date.now() - cnx._authStartTime : -1);
                    }
                    var legacyAuthData = crypt.crypt(cnx.options.password, const_1.default.LEGACY_AUTH_SALT).substring(2);
                    cnx.sendOpContAuth(legacyAuthData, const_1.default.DEFAULT_ENCODING, pluginName);
                    return; // wait for the database attach response
                }`;

const source = await readFile(connectionPath, 'utf8');

if (source.includes(patched)) {
  console.log('node-firebird chained authentication patch already applied');
} else if (source.includes(original)) {
  await writeFile(connectionPath, source.replace(original, patched));
  console.log('Applied node-firebird SRP + Legacy_Auth chained authentication patch');
} else {
  throw new Error(
    `Unable to patch ${connectionPath}: expected node-firebird 2.8.1 authentication block was not found`,
  );
}