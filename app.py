from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

webhooks = []

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "status": "online",
        "mensagem": "Servidor de webhooks está funcionando!",
        "endpoints": {
            "receber": "POST /webhook",
            "listar": "GET /webhooks"
        }
    })

@app.route('/webhook', methods=['POST', 'OPTIONS'])
def receber_webhook():
    if request.method == 'OPTIONS':
        return '', 200
    
    dados = request.get_json()
    webhooks.append(dados)
    return jsonify({"status": "sucesso", "mensagem": "Dados recebidos!"}), 200

@app.route('/webhooks', methods=['GET'])
def listar_webhooks():
    return jsonify(webhooks)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
