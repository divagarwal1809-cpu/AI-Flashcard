import os
import re
import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader
from PIL import Image
import io
import json
import base64

# Default Nvidia API key and configuration
NVIDIA_API_KEY = "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"
INVOKE_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        reader = PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text
    except Exception as e:
        return f"Error extracting PDF text: {str(e)}"

def extract_text_from_url(url: str) -> str:
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        for script in soup(["script", "style"]):
            script.decompose()
            
        text = soup.get_text(separator='\n')
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = '\n'.join(chunk for chunk in chunks if chunk)
        return text[:15000]
    except Exception as e:
        return f"Error extracting website content: {str(e)}"

def generate_flashcards_mock(text_content: str, num_cards: int = 5) -> list:
    sentences = re.split(r'(?<=[.!?])\s+', text_content.strip())
    sentences = [s.strip() for s in sentences if len(s.strip()) > 15]
    
    if not sentences:
        return [
            {"front": "What is FlashMind AI?", "back": "An AI-powered learning and study tool."},
            {"front": "How are these cards generated?", "back": "These are local offline fallback cards."}
        ]
        
    cards = []
    for i, s in enumerate(sentences[:num_cards]):
        words = s.split()
        if len(words) > 6:
            front = "Explain this statement: " + " ".join(words[:4]) + "..."
            back = s
        else:
            front = "What does this refer to?"
            back = s
        cards.append({"front": front, "back": back})
    return cards

def generate_flashcards_ai(content_text: str, num_cards: int = 10, image_bytes: bytes = None, api_key: str = None) -> list:
    active_key = api_key or os.getenv("GEMINI_API_KEY") or NVIDIA_API_KEY
    
    headers = {
        "Authorization": f"Bearer {active_key}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    prompt = f"""
    You are an expert educator. Your task is to analyze the input content and generate exactly {num_cards} high-quality study flashcards.
    The output must be a clean, valid JSON array. Each element in the array must be an object with the following structure:
    {{
        "front": "A clear, concise question, concept, or term to review",
        "back": "A concise, accurate answer, definition, or explanation"
    }}
    Ensure the flashcards cover critical concepts, facts, and definitions.
    Return ONLY the raw JSON array. Do not wrap it in ```json ... ``` or write any conversational text.
    """
    
    # Build payload
    content_payload = prompt + "\n\nContent:\n" + content_text
    
    if image_bytes:
        # If model supports base64 vision images
        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt + "\n\nExtract flashcards from this image content."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                ]
            }
        ]
    else:
        messages = [
            {
                "role": "user",
                "content": content_payload
            }
        ]
        
    payload = {
        "model": "google/gemma-4-31b-it",
        "messages": messages,
        "max_tokens": 4096,
        "temperature": 0.70,
        "top_p": 0.95,
        "stream": False,
        "chat_template_kwargs": {"enable_thinking": True}
    }
    
    try:
        response = requests.post(INVOKE_URL, headers=headers, json=payload, timeout=45)
        response.raise_for_status()
        
        res_data = response.json()
        response_text = res_data["choices"][0]["message"]["content"].strip()
        
        # Clean markdown code blocks if any
        if response_text.startswith("```"):
            lines = response_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            response_text = "\n".join(lines).strip()
            
        data = json.loads(response_text)
        if isinstance(data, list):
            return data
        elif isinstance(data, dict) and "flashcards" in data:
            return data["flashcards"]
        return generate_flashcards_mock(content_text, num_cards)
    except Exception as e:
        print(f"Nvidia API Error: {str(e)}. Falling back to local offline generation.")
        return generate_flashcards_mock(content_text, num_cards)

def chat_with_deck(card_list: list, chat_history: list, api_key: str = None) -> str:
    active_key = api_key or os.getenv("GEMINI_API_KEY") or NVIDIA_API_KEY
    
    headers = {
        "Authorization": f"Bearer {active_key}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    cards_context = "Here are the flashcards in this study deck:\n"
    for i, card in enumerate(card_list, 1):
        cards_context += f"Card {i}: Q: {card['front']} | A: {card['back']}\n"
        
    system_instruction = f"""
    You are FlashMind AI, an intelligent study assistant.
    The user is studying a deck of flashcards.
    Context:
    {cards_context}
    Help the user study, explain these concepts in detail, answer questions, provide examples, and test them. Keep answers concise, clear, and encouraging.
    """
    
    messages = [
        {"role": "system", "content": system_instruction}
    ]
    
    for msg in chat_history:
        role = "user" if msg["role"] == "user" else "assistant"
        messages.append({"role": role, "content": msg["content"]})
        
    payload = {
        "model": "google/gemma-4-31b-it",
        "messages": messages,
        "max_tokens": 1024,
        "temperature": 0.70,
        "top_p": 0.95,
        "stream": False,
        "chat_template_kwargs": {"enable_thinking": True}
    }
    
    try:
        response = requests.post(INVOKE_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        
        res_data = response.json()
        return res_data["choices"][0]["message"]["content"]
    except Exception as e:
        return f"Study Chat Error: {str(e)}"
