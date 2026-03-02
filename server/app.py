from flask import Flask
from flask_cors import CORS
import os
from dotenv import load_dotenv

from match_history import match_history
from match_details import match_details
from match_analysis import match_analysis

load_dotenv()

app = Flask(__name__)

NODE_ENV = os.getenv('NODE_ENV', 'production')

# Enable CORS only in development
if NODE_ENV == 'development':
    CORS(app)
    print('CORS enabled (development)')
else:
    print('CORS disabled (production)')

# Routes
app.add_url_rule('/match_history/', view_func=match_history, methods=['GET'])
app.add_url_rule('/match_details/', view_func=match_details, methods=['GET'])
app.add_url_rule('/match_analysis/', view_func=match_analysis, methods=['GET'])

if __name__ == '__main__':
    app.run(port=3000, debug=(NODE_ENV == 'development'))
