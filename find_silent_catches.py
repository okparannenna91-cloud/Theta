
import os
import re

def find_silent_catches(root_dir):
    catch_pattern = re.compile(r'catch\s*\(([^)]+)\)\s*\{([^}]*)\}', re.MULTILINE | re.DOTALL)
    log_pattern = re.compile(r'console\.(error|log|warn|info|debug)', re.IGNORECASE)
    
    silent_files = []
    
    for root, dirs, files in os.walk(root_dir):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if '.next' in dirs:
            dirs.remove('.next')
            
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        matches = catch_pattern.findall(content)
                        for match in matches:
                            var_name, block = match
                            if not log_pattern.search(block):
                                # Check if it's a very short block that might just return
                                # But if it has NO logging, it's potentially silent
                                silent_files.append((path, block.strip()))
                except Exception as e:
                    pass
    return silent_files

if __name__ == "__main__":
    results = find_silent_catches(r"c:\Users\NAOMIS\Desktop\021 - Copy\021 - Copy\app")
    for path, block in results:
        print(f"FILE: {path}\nBLOCK: {block}\n---\n")
