import json

with open(r'C:\Users\WCT\.gemini\antigravity\brain\8a2ec0fd-7537-4bf4-9039-5bf4b803ee62\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        if '"step_index":1843' in line:
            obj = json.loads(line)
            with open('prompt10.txt', 'w', encoding='utf-8') as out:
                out.write(obj.get('content', ''))
            print('Written length:', len(obj.get('content', '')))
            break
