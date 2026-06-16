from google import genai

client = genai.Client(api_key="AQ.Ab8RN6IM_6cDzT98txRu0liTOkyoL55gZuG8mbYDXIuZKqysIw")

for m in client.models.list():
    print(m.name)