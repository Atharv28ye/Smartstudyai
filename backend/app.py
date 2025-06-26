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

# ✅ Configure Cohere API
co = cohere.Client(os.getenv("VhxqoBjW6yKXig7FVNiLYpKJMmpB82w1EWVkbreR"))

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "https://smartstudyai-five.vercel.app"}})


@app.route("/")
def home():
    return "✅ SmartStudy AI Backend is Working!"


# Allowed file types
ALLOWED_EXTENSIONS = {"pdf", "docx"}

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
    raw = "\n".join(para.text for para in doc.paragraphs)
    return clean_text(raw)

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
                print("❌ File Processing Error:", e)
                return jsonify({"error": "Failed to extract text from file"}), 500

    return jsonify({"error": "Invalid file type"}), 400

@app.route("/generate-summary", methods=["POST"])
def generate_summary():
    try:
        input_text = request.json.get("text", "")
        style = request.json.get("style", "concise")

        if not input_text.strip():
            return jsonify({"error": "No text provided"}), 400

        style_instruction = {
            "concise": "Write a short and to-the-point paragraph summary of the following content.",
            "detailed": "Provide a detailed summary with key points, examples, and supporting information in a clear paragraph format.",
            "numbered": "Summarize the following content in at least 5 to 10 numbered points.",
            "simplified": "Summarize in simplified, easy-to-understand English for a 10th-grade student."
        }.get(style, "Write a short and to-the-point paragraph summary of the following content.")

        prompt = f"{style_instruction}\n\nText:\n{input_text}"
        response = co.chat(message=prompt, model="command-r-plus")

        return jsonify({"summary": response.text.strip()})
    except Exception as e:
        print("❌ Summary Error:", e)
        return jsonify({"error": "Failed to generate summary"}), 500

@app.route("/generate-quiz", methods=["POST"])
def generate_quiz():
    try:
        input_text = request.json.get("text", "")
        count = request.json.get("count", 5)
        difficulty = request.json.get("difficulty", "medium")

        if not input_text.strip():
            return jsonify({"error": "No text provided"}), 400

        prompt = f"""
Generate {count} multiple-choice questions from the following text.
Make them {difficulty} difficulty level. Each question must include:
- question
- options (a list of 4 options)
- correct_answer

Return ONLY a JSON array of objects, no explanation or notes.

Text:
{input_text}
"""

        # ✅ Get response from Cohere
        response = co.chat(message=prompt, model="command-r-plus")
        content = response.text.strip()

        # ✅ Extract JSON array using regex
        match = re.search(r"\[.*\]", content, re.DOTALL)
        if match:
            quiz_data = json.loads(match.group())
        else:
            quiz_data = json.loads(content)  # fallback

        return jsonify({"quiz": quiz_data})

    except Exception as e:
        import traceback
        print("❌ Quiz generation error:", e)
        traceback.print_exc()
        return jsonify({"error": "Failed to generate quiz"}), 500

@app.route("/flashcards", methods=["POST"])
def generate_flashcards():
    text = request.form.get("text", "")
    count = int(request.form.get("count", 10))
    file = request.files.get("file")
    file_text = ""

    # File extraction logic
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

        os.remove(file_path)  # Clean up

    final_text = (text or "").strip() + "\n" + (file_text or "").strip()

    if not final_text.strip():
        return jsonify({"error": "No content to generate flashcards"}), 400

    # Strong prompt to ensure all fields are filled
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
        print("💬 Cohere Raw Response:")
        print(raw_text)

        # Try extracting just the JSON array using regex
        match = re.search(r"\[.*\]", raw_text, re.DOTALL)
        if match:
            json_str = match.group()
        else:
            json_str = raw_text  # fallback

        flashcards = json.loads(json_str)

        # Filter out any incomplete cards
        cleaned = []
        for card in flashcards:
            if (
                isinstance(card, dict)
                and all(k in card for k in ("question", "answer", "hint", "explanation"))
                and card["question"].strip()
                and card["answer"].strip()
            ):
                cleaned.append(card)

        # Debug print for frontend
        print("Returning flashcards:", cleaned)

        if not cleaned:
            # Return a default card for testing the frontend
            default = [{
                "question": "Default question: Why is the sky blue?",
                "answer": "Because of Rayleigh scattering.",
                "hint": "Think about sunlight and atmosphere.",
                "explanation": "Short wavelengths scatter more in the atmosphere."
            }]
            print("No valid flashcards generated. Returning default for debugging.")
            return jsonify({"flashcards": default}), 200

        return jsonify({"flashcards": cleaned})
    except Exception as e:
        print("❌ Flashcard Parsing Error:", e)
        # Return a default card for debugging frontend
        default = [{
            "question": "Default question: Why is the sky blue?",
            "answer": "Because of Rayleigh scattering.",
            "hint": "Think about sunlight and atmosphere.",
            "explanation": "Short wavelengths scatter more in the atmosphere."
        }]
        return jsonify({"flashcards": default}), 200

@app.route("/chat", methods=["POST"])
def chatbot_reply():
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

@app.route("/generate-hint", methods=["POST"])
def generate_hint():
    try:
        question = request.json.get("question", "")
        context = request.json.get("context", "")

        if not question.strip():
            return jsonify({"error": "Question text missing"}), 400

        prompt = f"Give a helpful hint for this MCQ using the context below.\n\nQuestion: {question}\n\nContext:\n{context}"
        response = co.chat(message=prompt, model="command-r-plus")

        return jsonify({"hint": response.text.strip()})
    except Exception as e:
        print("❌ Hint Error:", e)
        return jsonify({"error": "Failed to generate hint"}), 500

@app.route("/explain-answer", methods=["POST"])
def explain_answer():
    try:
        question = request.json.get("question", "")
        correct_answer = request.json.get("correct_answer", "")
        user_answer = request.json.get("user_answer", "")
        context = request.json.get("context", "")

        if not question or not correct_answer:
            return jsonify({"error": "Missing required data"}), 400

        prompt = f"""You are an AI tutor. Explain why the answer \"{correct_answer}\" is correct for the question below. 
Also mention if the user's selected answer \"{user_answer}\" is incorrect, why it's wrong, based on the context.

Question: {question}
Context: {context}
"""
        response = co.chat(message=prompt, model="command-r-plus")

        return jsonify({"explanation": response.text.strip()})
    except Exception as e:
        print("❌ Explanation Error:", e)
        return jsonify({"error": "Failed to generate explanation"}), 500

if __name__ == "__main__":
    app.run(debug=True)
