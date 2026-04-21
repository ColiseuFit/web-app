async function test() {
    try {
        const res = await fetch(`https://ml4izq-ip-160-238-225-166.tunnelmole.net/api/webhooks/strava?hub.mode=subscribe&hub.verify_token=coliseu_strava_webhook_token_2026&hub.challenge=test_123`);
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Response:", text);
    } catch (e) {
        console.log("Error:", e);
    }
}
test();
