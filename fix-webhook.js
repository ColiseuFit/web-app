const clientId = '228570';
const clientSecret = '86f8098635d6361bb3ce89aaadfef5e55e40843e';
const targetUrl = 'https://clube.coliseufit.com/api/webhooks/strava';

async function run() {
  console.log("Buscando assinaturas...");
  const getRes = await fetch(`https://www.strava.com/api/v3/push_subscriptions?client_id=${clientId}&client_secret=${clientSecret}`);
  const subs = await getRes.json();
  console.log("Assinaturas atuais:", subs);

  for (const sub of subs) {
    console.log("Deletando assinatura ID", sub.id);
    const delRes = await fetch(`https://www.strava.com/api/v3/push_subscriptions/${sub.id}?client_id=${clientId}&client_secret=${clientSecret}`, { method: 'DELETE' });
    console.log("Resposta delete:", delRes.status);
  }

  console.log(`Criando nova assinatura para ${targetUrl}...`);
  const createRes = await fetch(`https://www.strava.com/api/v3/push_subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      callback_url: targetUrl,
      verify_token: 'coliseu_strava_webhook_token_2026'
    })
  });
  
  const text = await createRes.text();
  console.log("Resultado final:", createRes.status, text);
}

run();
