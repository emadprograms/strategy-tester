import os
import google.generativeai as genai

# Ensure GEMINI_API_KEY is set in your environment
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("Error: GEMINI_API_KEY environment variable is not set.")
    exit(1)

genai.configure(api_key=api_key)

try:
    model = genai.GenerativeModel('gemma-3-27b-it')
    response = model.generate_content("Hello! Are you working?")
    print("Success! Response from model:", response.text)
except Exception as e:
    print("Error connecting to Gemini API:", e)
