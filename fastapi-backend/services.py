import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(
    api_key=os.environ.get("GROQ_API_KEY"),
)

MODELS = {
    "groq": os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")
}


def get_simplification(text: str, context: str, level: str, mode: str = "simplify") -> str:
    """
    Simplifies or Defines the given text based on context.
    """
    
    if mode == "define":
        system_prompt = (
            "You are a helpful academic assistant. "
            "Provide a concise, easy-to-understand definition of the highlighted word in the given context. "
            "Keep the definition under 15 words."
        )
        user_prompt = f"""
        Context: {context}
        Word to define: {text}
        
        Definition:
        """
    else:
        # Simplification Mode
        system_prompt = (
            "You are a Context-Aware Leixcal Simplification expert. "
            "Your goal is to replace the target word with a simpler, easier-to-understand synonym that fits the context perfectly. "
            "Rules:\n"
            "1. Return ONLY the simplified word/phrase. No explanations.\n"
            "2. Maintain the original grammatical form (tense, plurality, capitalization).\n"
            "3. If the word is a specific scientific term (e.g., 'Neutrino', 'Galaxy') that cannot be simplified without losing meaning, return the ORIGINAL word.\n"
            "4. Do NOT define the word. REPLACE it.\n"
            "5. Ensure the replacement is a common English word (CEFR B2 or lower)."
        )
        user_prompt = f"""
        Context: {context}
        Word to simplify: {text}
        Target Simplicity Level: {level.upper()}
        
        Simplified Word:
        """

    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_prompt,
            }
        ],
        model=MODELS["groq"],
        temperature=0.3,
        max_tokens=30 if mode == "define" else 20,
    )

    return chat_completion.choices[0].message.content.strip()
