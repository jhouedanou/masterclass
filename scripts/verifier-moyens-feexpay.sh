#!/usr/bin/env bash
# Demande à FeexPay si la carte et Wave sont ouverts sur la boutique.
#
# Ouvre deux demandes de paiement de 100 F CFA avec la clé d'API live, sans
# aller au bout : rien n'est prélevé tant que personne ne saisit de carte ni ne
# valide dans Wave. Une réponse portant une adresse de paiement signifie que le
# moyen est ouvert ; sinon FeexPay dit pourquoi (KYC carte, clé agrégée Wave).
#
#   bash scripts/verifier-moyens-feexpay.sh [numéro Wave, ex. 2250700000000]
#
# Lit FEEXPAY_BASE_URL, FEEXPAY_SHOP_ID et FEEXPAY_API_KEY dans .env. N'affiche
# ni la clé ni l'adresse de paiement complète.
set -euo pipefail
cd "$(dirname "$0")/.."

# Lecture ciblée plutôt que `. ./.env` : le fichier porte des valeurs à espaces
# sans guillemets (SMTP_NOM), que le shell prendrait pour des commandes.
lire() { grep "^$1=" .env | head -1 | cut -d= -f2- | tr -d "\"'\r"; }
FEEXPAY_BASE_URL="$(lire FEEXPAY_BASE_URL)"
FEEXPAY_SHOP_ID="$(lire FEEXPAY_SHOP_ID)"
FEEXPAY_API_KEY="$(lire FEEXPAY_API_KEY)"
if [ -z "$FEEXPAY_SHOP_ID" ] || [ -z "$FEEXPAY_API_KEY" ]; then
  echo "FEEXPAY_SHOP_ID ou FEEXPAY_API_KEY absente de .env" >&2; exit 1
fi

BASE="${FEEXPAY_BASE_URL:-https://api-v2.feexpay.me}"
NUMERO="${1:-2250700000000}"

resumer() {
  python3 -c '
import sys, json, re
texte = sys.stdin.read()
corps, _, code = texte.rpartition("\nHTTP ")
try:
    d = json.loads(corps)
except Exception:
    print("  HTTP", code.strip(), "—", corps[:300]); sys.exit()
url = d.get("payment_url") or d.get("paymentUrl")
if url:
    print("  OUVERT — HTTP", code.strip(), "— adresse de paiement reçue (", re.sub(r"(https?://[^/]+).*", r"\1", url), ")")
else:
    print("  FERMÉ — HTTP", code.strip(), "—", json.dumps(d, ensure_ascii=False)[:400])
'
}

echo "Carte (Visa, Mastercard, Djamo) :"
curl -s -m 30 -w '\nHTTP %{http_code}' -X POST "$BASE/api/transactions/public/requesttopay/init" \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $FEEXPAY_API_KEY" \
  -d "{\"shop\":\"$FEEXPAY_SHOP_ID\",\"amount\":100,\"currency\":\"XOF\",\"first_name\":\"Verification\",\"last_name\":\"Technique\",\"email\":\"contacts@bigfiveabidjan.com\",\"phoneNumber\":\"$NUMERO\",\"description\":\"Verification activation carte\"}" \
  | resumer

echo "Wave :"
curl -s -m 30 -w '\nHTTP %{http_code}' -X POST "$BASE/api/transactions/requesttopay/integration" \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $FEEXPAY_API_KEY" \
  -d "{\"phoneNumber\":\"$NUMERO\",\"country\":\"225\",\"amount\":\"100\",\"currency\":\"XOF\",\"description\":\"Verification activation Wave\",\"reseau\":\"WAVE CI\",\"shop\":\"$FEEXPAY_SHOP_ID\",\"token\":\"$FEEXPAY_API_KEY\",\"merchant_domain\":\"https://bigfiveacademy.com\",\"payment_interface\":\"JAVASCRIPT\",\"return_url\":\"https://bigfiveacademy.com/achat/paiement\",\"email\":\"\",\"first_name\":\"\"}" \
  | resumer
