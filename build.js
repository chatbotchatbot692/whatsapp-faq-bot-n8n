// Genera i workflow n8n importabili da src/matcher.js + packs/*.json.
// Uso: node build.js   ->   dist/free/workflow-generico.json, dist/pro/workflow-<pack>.json
const fs = require('fs');
const path = require('path');

const root = __dirname;
const matcherSrc = fs.readFileSync(path.join(root, 'src', 'matcher.js'), 'utf8')
  .split('\n').filter((l) => !l.startsWith('if (typeof module')).join('\n');

const GRAPH_URL = 'https://graph.facebook.com/v21.0'; // aggiornare alla versione corrente dell'API Meta

function codeFor(pack) {
  return matcherSrc + '\n\n' +
    'const cfg = ' + JSON.stringify(pack, null, 2) + ';\n' +
    'const incoming = parseIncoming($input.first().json.body);\n' +
    'const r = buildReply(incoming, cfg, new Date());\n' +
    'if (!r) return [];\n' +
    'return [{ json: Object.assign({}, r, { text: incoming.text }) }];\n';
}

function sendBody(toExpr, textExpr) {
  return '={{ JSON.stringify({ messaging_product: "whatsapp", to: ' + toExpr +
    ', type: "text", text: { body: ' + textExpr + ' } }) }}';
}

function httpNode(id, name, position, toExpr, textExpr) {
  return {
    parameters: {
      method: 'POST',
      url: '=' + GRAPH_URL + '/{{ $json.phoneNumberId }}/messages',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: sendBody(toExpr, textExpr),
      options: {}
    },
    id, name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position
  };
}

function ifNode(id, name, position, left, op, right) {
  return {
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [{ id: id + '-c', leftValue: left, rightValue: right, operator: op }],
        combinator: 'and'
      },
      options: {}
    },
    id, name, type: 'n8n-nodes-base.if', typeVersion: 2, position
  };
}

function link(to) { return { node: to, type: 'main', index: 0 }; }

function buildWorkflow(pack, withNotify) {
  const nodes = [
    {
      parameters: { httpMethod: 'GET', path: 'whatsapp', responseMode: 'responseNode', options: {} },
      id: 'n-verify-in', name: 'Verifica webhook (GET)', type: 'n8n-nodes-base.webhook', typeVersion: 2,
      position: [0, 0], webhookId: '5b1d6a10-0000-4000-8000-000000000001'
    },
    ifNode('n-verify-if', 'Token valido?', [220, 0], "={{ $json.query['hub.verify_token'] }}",
      { type: 'string', operation: 'equals' }, '[VERIFY_TOKEN]'),
    {
      parameters: { respondWith: 'text', responseBody: "={{ $json.query['hub.challenge'] }}", options: {} },
      id: 'n-verify-ok', name: 'Rispondi challenge', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.1,
      position: [440, -60]
    },
    {
      parameters: { respondWith: 'text', responseBody: 'Forbidden', options: { responseCode: 403 } },
      id: 'n-verify-ko', name: 'Rispondi 403', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.1,
      position: [440, 80]
    },
    {
      parameters: { httpMethod: 'POST', path: 'whatsapp', responseMode: 'onReceived', options: {} },
      id: 'n-msg-in', name: 'Messaggio WhatsApp (POST)', type: 'n8n-nodes-base.webhook', typeVersion: 2,
      position: [0, 300], webhookId: '5b1d6a10-0000-4000-8000-000000000002'
    },
    {
      parameters: { mode: 'runOnceForAllItems', jsCode: codeFor(pack) },
      id: 'n-faq', name: 'FAQ e orari', type: 'n8n-nodes-base.code', typeVersion: 2, position: [220, 300]
    },
    httpNode('n-reply', 'Invia risposta', [440, 300], '$json.to', '$json.reply')
  ];
  const connections = {
    'Verifica webhook (GET)': { main: [[link('Token valido?')]] },
    'Token valido?': { main: [[link('Rispondi challenge')], [link('Rispondi 403')]] },
    'Messaggio WhatsApp (POST)': { main: [[link('FAQ e orari')]] },
    'FAQ e orari': { main: [[link('Invia risposta')]] }
  };
  if (withNotify) {
    nodes.push(
      ifNode('n-handoff', 'Serve una persona?', [440, 480], '={{ $json.handoff }}',
        { type: 'boolean', operation: 'true', singleValue: true }, ''),
      httpNode('n-notify', 'Avvisa titolare', [660, 480], '"[NUMERO_TITOLARE_SENZA_PIU]"',
        '"Da gestire: +" + $json.to + " ha scritto: " + $json.text')
    );
    connections['FAQ e orari'].main[0].push(link('Serve una persona?'));
    connections['Serve una persona?'] = { main: [[link('Avvisa titolare')], []] };
  }
  return {
    name: 'WhatsApp FAQ bot - ' + pack.name + (withNotify ? ' (Pro)' : ' (Free)'),
    nodes, connections, settings: { executionOrder: 'v1' }
  };
}

function write(rel, obj) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n');
  return rel;
}

function loadPack(name) { return JSON.parse(fs.readFileSync(path.join(root, 'packs', name + '.json'), 'utf8')); }

function buildAll() {
  const out = [];
  out.push(write('dist/free/workflow-generico.json', buildWorkflow(loadPack('generico'), false)));
  for (const n of ['generico', 'officina-ricambi', 'studio-professionale', 'negozio']) {
    if (!fs.existsSync(path.join(root, 'packs', n + '.json'))) continue; // il repo gratuito ha solo "generico"
    out.push(write('dist/pro/workflow-' + n + '.json', buildWorkflow(loadPack(n), true)));
  }
  return out;
}

if (require.main === module) console.log(buildAll().join('\n'));
module.exports = { buildWorkflow, loadPack, buildAll };
