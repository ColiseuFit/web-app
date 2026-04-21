

async function subscribe() {
    const res = await fetch(`https://www.strava.com/api/v3/push_subscriptions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            client_id: '228570',
            client_secret: '86f8098635d6361bb3ce89aaadfef5e55e40843e',
            callback_url: 'https://ml4izq-ip-160-238-225-166.tunnelmole.net/api/webhooks/strava',
            verify_token: 'coliseu_strava_webhook_token_2026'
        })
    });
    
    const text = await res.text();
    console.log(res.status, text);
}

subscribe();
