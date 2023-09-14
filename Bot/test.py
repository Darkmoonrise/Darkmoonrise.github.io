from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/', methods=['POST'])
def process_text():
    try:
        data = request.get_json()
        text = data.get("text", "")
        
        # You can process the text here in your Python script
        result = f"You entered: {text}"
        
        return jsonify({"result": result})
    except Exception as e:
        return jsonify({"error": str(e)})

if __name__ == '__main__':
    app.run(debug=True)