from flask import jsonify

def send_server_error():
    return jsonify({'error': 'Internal Server Error'}), 500
