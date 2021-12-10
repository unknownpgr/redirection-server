const { createClient } = require('redis');
const Koa = require('koa');
const Router = require('koa-router');
const body = require('koa-bodyparser');
const serve = require('koa-static');
const path = require('path');

const prefiex = prefix => value => `${prefix}${value}`;
const h = prefiex('h'); // Prefix for hash
const u = prefiex('u'); // Prefix for URL
const k = prefiex('k'); // Prefix for key

const safeChars = [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._'];
const N = safeChars.length;
const num2char = Object.fromEntries(safeChars.map((x, i) => [i, x]));

function encode(number) {
  let result = '';
  while (number > 0) {
    result += num2char[number % N];
    number = Math.floor(number / N);
  }
  return result;
};

async function main() {
  const client = createClient({
    url: 'redis://redis:6379'
  });
  client.on('error', (err) => console.log('Redis Client Error', err));
  await client.connect();

  const app = new Koa();
  const router = new Router();

  router.get('/:hash', async ctx => {
    const { hash } = ctx.params;
    if (!hash) {
      return;
    }
    const url = await client.get(h(hash));
    if (url) ctx.redirect(url);
    else ctx.response.status = 404;
  });

  router.post('/', body(), async ctx => {
    const { url } = ctx.request.body;
    if (!url) {
      ctx.response.status = 400;
      return;
    }

    const hash = await client.get(u(url));
    if (hash) {
      // Cache hit
      ctx.body = hash;
    } else {
      // Cache miss
      const newHash = encode(await client.incr(k('hash')));
      // Save both key-value and value-key
      await client.set(h(newHash), url);
      await client.set(u(url), newHash);
      ctx.body = newHash;
    }
  });

  app.use(router.routes());
  app.use(serve(path.join(__dirname, '/static')));
  app.listen(80);
}

main();