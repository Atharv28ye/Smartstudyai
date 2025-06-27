from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import cohere
import os
import json
from werkzeug.utils import secure_filename
import tempfile
import docx
import fitz  # PyMuPDF
import re

# Load environment variables
load_dotenv()

co = cohere.Client(os.getenv("COHERE_API_KEY"))

app = Flask(__name__)
CORS(app, supports_credentials=False)

ALLOWED_EXTENSIONS = {"pdf", "docx"}

# --- UTILS ---
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def clean_text(text):
    text = re.sub(r"[^\x00-\x7F]+", "", text)
    text = re.sub(r"\b([a-zA-Z])\s(?=[a-zA-Z]\b)", r"\1", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def extract_text_from_pdf(file_path):
    text = ""
    with fitz.open(file_path) as doc:
        for page in doc:
            text += page.get_text()
    return clean_text(text)

def extract_text_from_docx(file_path):
    doc = docx.Document(file_path)
    return clean_text("\n".join(para.text for para in doc.paragraphs))

# --- ROUTES ---
@app.route("/", methods=["GET"])
def home():
    return "✅ SmartStudy AI Backend is Running!"

@app.route("/upload-file", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            file.save(temp_file.name)

            try:
                if filename.endswith(".pdf"):
                    extracted_text = extract_text_from_pdf(temp_file.name)
                elif filename.endswith(".docx"):
                    extracted_text = extract_text_from_docx(temp_file.name)
                else:
                    return jsonify({"error": "Unsupported file type"}), 400

                return jsonify({"text": extracted_text})
            except Exception as e:
                return jsonify({"error": f"File processing error: {str(e)}"}), 500

    return jsonify({"error": "Invalid file type"}), 400

@app.route("/generate-summary", methods=["POST"])
def generate_summary():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON payload"}), 400

    input_text = data.get("text", "")
    style = data.get("style", "concise")

    if not input_text.strip():
        return jsonify({"error": "No text provided"}), 400

    style_instruction = {
        "concise": "Write a short and to-the-point paragraph summary.",
        "detailed": "Provide a detailed summary with key points.",
        "numbered": "Summarize in 5-10 numbered points.",
        "simplified": "Summarize in simplified English for a 10th grader."
    }.get(style, "Write a short and to-the-point paragraph summary.")

    prompt = f"{style_instruction}\n\nText:\n{input_text}"
    try:
        response = co.chat(message=prompt, model="command-r-plus")
        return jsonify({"summary": response.text.strip()})
    except Exception as e:
        return jsonify({"error": f"Summary generation failed: {str(e)}"}), 500

@app.route("/generate-quiz", methods=["POST"])
def generate_quiz():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON payload"}), 400

    input_text = data.get("text", "")
    count = data.get("count", 5)
    difficulty = data.get("difficulty", "medium")

    if not input_text.strip():
        return jsonify({"error": "No text provided"}), 400

    prompt = f"""
Generate {count} multiple-choice questions from the following text.
Difficulty: {difficulty}
Each question must include: question, options, correct_answer
Respond ONLY with JSON array.

Text:
{input_text}
"""
    try:
        response = co.chat(message=prompt, model="command-r-plus")
        content = response.text.strip()
        match = re.search(r"\[.*\]", content, re.DOTALL)
        quiz_data = json.loads(match.group()) if match else json.loads(content)
        return jsonify({"quiz": quiz_data})
    except Exception as e:
        return jsonify({"error": f"Quiz generation failed: {str(e)}"}), 500

@app.route("/generate-hint", methods=["POST"])
def generate_hint():
    data = request.get_json()
    question = data.get("question", "")
    context = data.get("context", "")

    if not question.strip():
        return jsonify({"error": "Question is required"}), 400

    prompt = f"Give a helpful hint for this MCQ based on the context.\n\nQuestion: {question}\n\nContext:\n{context}"
    try:
        response = co.chat(message=prompt, model="command-r-plus")
        return jsonify({"hint": response.text.strip()})
    except Exception as e:
        return jsonify({"error": f"Hint generation failed: {str(e)}"}), 500
    
@app.route("/chat", methods=["POST"])

def chatbot_reply():
    # ✅ Ensure JSON request to prevent 415 Unsupported Media Type
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 415

    try:
        data = request.json
        user_message = data.get("message", "").strip()
        context = data.get("context", "")
        history = data.get("history", [])

        if not user_message:
            return jsonify({"error": "Empty message"}), 400

        history_text = "\n".join([f"{msg['role'].capitalize()}: {msg['content']}" for msg in history])

        prompt = f"""
You are SmartStudy AI, a helpful academic assistant.

Here is the previous chat history:
{history_text}

Context: {context}

Now answer the new message below. Always include proper **citations**, references, or source links if available.
Then suggest 2–3 follow-up questions.

User: {user_message}

Format:
Answer: <your answer with citations or source links>

Follow-Up Prompts:
1. <first question>
2. <second question>
3. <third question>
"""

        response = co.chat(message=prompt, model="command-r-plus")
        text = response.text.strip()

        if "Follow-Up Prompts:" in text:
            answer, followups = text.split("Follow-Up Prompts:")
            followup_lines = [line.strip() for line in followups.strip().split("\n") if line.strip()]
        else:
            answer = text
            followup_lines = []

        return jsonify({
            "reply": answer.strip(),
            "followups": followup_lines[:3]
        })

    except Exception as e:
        print("❌ Chatbot Error:", e)
        return jsonify({"error": "Failed to generate response"}), 500         

@app.route("/flashcards", methods=["POST",])
def generate_flashcards():
    # ✅ Check for multipart/form-data (required for file uploads)
    if not request.content_type.startswith("multipart/form-data"):
        return jsonify({"error": "Content-Type must be multipart/form-data"}), 415

    text = request.form.get("text", "")
    count = int(request.form.get("count", 10))
    file = request.files.get("file")
    file_text = ""

    if file:
        filename = secure_filename(file.filename)
        file_path = os.path.join("uploads", filename)
        os.makedirs("uploads", exist_ok=True)
        file.save(file_path)

        if filename.lower().endswith(".pdf"):
            file_text = extract_text_from_pdf(file_path)
        elif filename.lower().endswith(".docx"):
            file_text = extract_text_from_docx(file_path)
        elif filename.lower().endswith(".txt"):
            with open(file_path, "r", encoding="utf-8") as f:
                file_text = f.read()
        else:
            os.remove(file_path)
            return jsonify({"error": "Unsupported file format"}), 400

        os.remove(file_path)

    final_text = (text or "").strip() + "\n" + (file_text or "").strip()

    if not final_text.strip():
        return jsonify({"error": "No content to generate flashcards"}), 400

    prompt = (
        f"Generate {count} flashcards as a JSON array. "
        "Each object must have these fields (no empty values!): "
        "question, answer, hint, explanation. "
        "Fill ALL fields with meaningful content derived from the input. "
        "Respond ONLY with the JSON array, no other explanation or text. "
        "Example:\n"
        '[{"question": "What is X?", "answer": "X is ...", "hint": "Think about ...", "explanation": "Because ..."}]\n'
        "Content:\n"
        + final_text
    )

    try:
        response = co.chat(model="command-r-plus", message=prompt)
        raw_text = response.text.strip()
        match = re.search(r"\[.*\]", raw_text, re.DOTALL)
        if match:
            json_str = match.group()
        else:
            json_str = raw_text

        flashcards = json.loads(json_str)
        cleaned = [card for card in flashcards if all(
            k in card and card[k].strip() for k in ("question", "answer", "hint", "explanation"))]

        if not cleaned:
            return jsonify({"flashcards": [DEFAULT_FLASHCARD]}), 200

        return jsonify({"flashcards": cleaned})
    except Exception as e:
        print("❌ Flashcard Parsing Error:", e)
        return jsonify({"flashcards": [DEFAULT_FLASHCARD]}), 200

# Optional: define a reusable fallback card
DEFAULT_FLASHCARD = {
    "question": "Default question: Why is the sky blue?",
    "answer": "Because of Rayleigh scattering.",
    "hint": "Think about sunlight and atmosphere.",
    "explanation": "Short wavelengths scatter more in the atmosphere."
}

@app.route("/explain-answer", methods=["POST"])
def explain_answer():
    data = request.get_json()
    question = data.get("question", "")
    correct_answer = data.get("correct_answer", "")
    user_answer = data.get("user_answer", "")
    context = data.get("context", "")

    if not question or not correct_answer:
        return jsonify({"error": "Missing data"}), 400

    prompt = f"""
Explain why \"{correct_answer}\" is correct for the question: \"{question}\".
Mention if \"{user_answer}\" is wrong, and explain why using the context:

{context}
"""
    try:
        response = co.chat(message=prompt, model="command-r-plus")
        return jsonify({"explanation": response.text.strip()})
    except Exception as e:
        return jsonify({"error": f"Explanation failed: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True)
