/* Minimal structured logger; swap for pino if you need more. */
const ts = () => new Date().toISOString();
export const logger = {
  info: (...a) => process.env.NODE_ENV !== 'test' && console.log(ts(), '[info]', ...a),
  warn: (...a) => console.warn(ts(), '[warn]', ...a),
  error: (...a) => console.error(ts(), '[error]', ...a),
};
