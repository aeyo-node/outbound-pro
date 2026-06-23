import asyncio
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)

async def test():
    # Add project root to path
    import sys
    sys.path.append(r"c:\Users\chris\Documents\outbound-pro")
    
    from tools import summarize_call_transcript
    print("Testing OpenRouter/GPT-4o transcript summary...")
    
    mock_transcript = """
[USER]: Hello, this is Swaram International School.
[USER]: I'd like to talk to Mr. Matthew.
[AGENT]: Hi Mr. Matthew! This is the Outbound AI. I'm calling to see if you'd be interested in a free website demo.
[USER]: Oh, a free demo? Yes, I'm very interested. 
[USER]: Please send the details to my WhatsApp.
[AGENT]: Great! Could you confirm your WhatsApp number?
[USER]: It's 8086477654.
[AGENT]: Perfect, I will send the demo to 8086477654 right away. Have a great day!
[USER]: You too, thanks.
"""
    
    res = await summarize_call_transcript(mock_transcript)
    print("\n\n" + "="*50)
    print("                 FINAL RESULT                  ")
    print("="*50 + "\n")
    print(res)
    print("\n" + "="*50)

if __name__ == "__main__":
    asyncio.run(test())
