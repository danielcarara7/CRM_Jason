from flask import Flask, request, jsonify
from datetime import datetime
import json

app = Flask(__name__)

# Armazena os webhooks recebidos (em memória)
webhooks_recebidos = []

@app.route('/webhook', methods=['POST'])
def receber_webhook():
    """Recebe webhooks do CRM Jason"""
    try:
        dados = request.get_json()
        
        # Adiciona timestamp
        dados['recebido_em'] = datetime.now().isoformat()
        
        # Armazena
        webhooks_recebidos.append(dados)
        
        print(f"✅ Webhook recebido: {dados}")
        
        return jsonify({
            "status": "sucesso",
            "mensagem": "Webhook recebido com sucesso",
            "total_recebidos": len(webhooks_recebidos)
        }), 200
        
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        return jsonify({
            "status": "erro",
            "mensagem": str(e)
        }), 400

@app.route('/webhooks', methods=['GET'])
def listar_webhooks():
    """Lista todos os webhooks recebidos"""
    return jsonify({
        "total": len(webhooks_recebidos),
        "webhooks": webhooks_recebidos
    }), 200

@app.route('/', methods=['GET'])
def home():
    """Página inicial"""
    return jsonify({
        "status": "online",
        "mensagem": "Servidor de webhooks está funcionando!",
        "endpoints": {
            "receber": "POST /webhook",
            "listar": "GET /webhooks"
        }
    }), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
